/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { POSITION_GAP } = require('../../../constants');

const CARD_UPDATE_MISSED = Symbol('CARD_UPDATE_MISSED');

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    values: {
      type: 'json',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    positionMustBeInValues: {},
    boardInValuesMustBelongToProject: {},
    listMustBeInValues: {},
    listInValuesMustBelongToBoard: {},
    coverAttachmentInValuesMustContainImage: {},
  },

  // TODO: use normalizeValues and refactor
  async fn(inputs) {
    const { isSubscribed, ...values } = inputs.values;

    if (values.project && values.project.id === inputs.project.id) {
      delete values.project;
    }

    const project = values.project || inputs.project;

    if (values.board) {
      if (values.board.projectId !== project.id) {
        throw 'boardInValuesMustBelongToProject';
      }

      if (values.board.id === inputs.board.id) {
        delete values.board;
      } else {
        values.boardId = values.board.id;
      }
    }

    const board = values.board || inputs.board;

    if (values.list) {
      if (values.list.boardId !== board.id) {
        throw 'listInValuesMustBelongToBoard';
      }

      if (values.list.id === inputs.list.id) {
        delete values.list;
      } else {
        values.listId = values.list.id;
      }
    } else if (values.board) {
      throw 'listMustBeInValues';
    }

    const list = values.list || inputs.list;

    if (sails.helpers.lists.isFinite(list)) {
      if (values.list && _.isUndefined(values.position)) {
        throw 'positionMustBeInValues';
      }
    } else {
      values.position = null;
    }

    if (values.coverAttachment) {
      if (!values.coverAttachment.data.image && !values.coverAttachment.data.video) {
        throw 'coverAttachmentInValuesMustContainImage';
      }

      values.coverAttachmentId = values.coverAttachment.id;
    }

    let card;
    if (_.isEmpty(values)) {
      card = inputs.record;
    } else {
      let repositions = [];
      if (!_.isNil(values.position)) {
        const cards = await Card.qm.getByListId(list.id, {
          exceptIdOrIds: inputs.record.id,
        });

        const insertResult = sails.helpers.utils.insertToPositionables(values.position, cards);

        values.position = insertResult.position;
        repositions = insertResult.repositions;

        if (!values.board && repositions.length > 0) {
          // eslint-disable-next-line no-restricted-syntax
          for (const reposition of repositions) {
            // eslint-disable-next-line no-await-in-loop
            await Card.qm.updateOne(
              {
                id: reposition.record.id,
                listId: reposition.record.listId,
              },
              {
                position: reposition.position,
              },
            );

            sails.sockets.broadcast(`board:${board.id}`, 'cardUpdate', {
              item: {
                id: reposition.record.id,
                position: reposition.position,
              },
            });

            // TODO: send webhooks
          }
        }
      }

      if (values.list) {
        values.listChangedAt = new Date().toISOString();

        if (values.board || inputs.list.type === List.Types.TRASH) {
          values.prevListId = null;
        } else if (sails.helpers.lists.isArchiveOrTrash(values.list)) {
          values.prevListId = inputs.list.id;
        } else if (inputs.list.type === List.Types.ARCHIVE) {
          values.prevListId = null;
        }
      }

      let prevLabels;
      let createdLabels = [];
      let labelRepositions = [];
      if (values.board) {
        prevLabels = await sails.helpers.cards.getLabels(inputs.record.id);

        const targetLabels = await Label.qm.getByBoardId(values.board.id);
        const targetLabelByName = _.keyBy(targetLabels, 'name');
        const missingLabels = prevLabels.filter((label) => !targetLabelByName[label.name]);
        const missingLabelIds = await sails.helpers.utils.generateIds(missingLabels.length);
        const missingLabelIdById = _.zipObject(
          sails.helpers.utils.mapRecords(missingLabels),
          missingLabelIds,
        );
        const positionedLabels = targetLabels.map((label) => ({ ...label }));

        const nextLabelValues = missingLabels.map((label) => {
          const insertion = sails.helpers.utils.insertToPositionables(
            label.position,
            positionedLabels,
          );

          insertion.repositions.forEach((reposition) => {
            const positionedLabel = positionedLabels.find(({ id }) => id === reposition.record.id);
            positionedLabel.position = reposition.position;
          });

          const nextLabel = {
            ..._.pick(label, ['name', 'color']),
            id: missingLabelIdById[label.id],
            boardId: values.board.id,
            position: insertion.position,
          };

          positionedLabels.push(nextLabel);
          positionedLabels.sort((left, right) => left.position - right.position);

          return nextLabel;
        });

        labelRepositions = targetLabels.reduce((result, label) => {
          const positionedLabel = positionedLabels.find(({ id }) => id === label.id);

          if (positionedLabel.position !== label.position) {
            result.push({
              record: label,
              position: positionedLabel.position,
            });
          }

          return result;
        }, []);

        const positionedNextLabelValues = nextLabelValues.map((nextLabel) => {
          const positionedLabel = positionedLabels.find(({ id }) => id === nextLabel.id);

          return {
            ...nextLabel,
            position: positionedLabel.position,
          };
        });

        const nextLabelIds = _.uniq(
          prevLabels.map(
            (label) =>
              (targetLabelByName[label.name] && targetLabelByName[label.name].id) ||
              missingLabelIdById[label.id],
          ),
        );

        const boardMemberUserIds = await sails.helpers.boards.getMemberUserIds(values.board.id);

        const taskLists = await TaskList.qm.getByCardId(inputs.record.id);
        const taskListIds = sails.helpers.utils.mapRecords(taskLists);

        const boardCustomFieldGroups = await CustomFieldGroup.qm.getByBoardId(inputs.board.id);
        const boardCustomFieldGroupIds = sails.helpers.utils.mapRecords(boardCustomFieldGroups);

        const boardCustomFields =
          await CustomField.qm.getByCustomFieldGroupIds(boardCustomFieldGroupIds);

        const cardCustomFieldGroups = await CustomFieldGroup.qm.getByCardId(inputs.record.id);

        let basedCardCustomFieldGroups;
        let basedCustomFieldGroups;
        let baseCustomFieldGroupById;
        let customFieldsByBaseCustomFieldGroupId;

        if (values.project) {
          const basedBoardCustomFieldGroups = boardCustomFieldGroups.filter(
            ({ baseCustomFieldGroupId }) => baseCustomFieldGroupId,
          );

          basedCardCustomFieldGroups = cardCustomFieldGroups.filter(
            ({ baseCustomFieldGroupId }) => baseCustomFieldGroupId,
          );

          basedCustomFieldGroups = [...basedBoardCustomFieldGroups, ...basedCardCustomFieldGroups];

          const baseCustomFieldGroupIds = sails.helpers.utils.mapRecords(
            basedCustomFieldGroups,
            'baseCustomFieldGroupId',
            true,
          );

          const baseCustomFieldGroups =
            await BaseCustomFieldGroup.qm.getByIds(baseCustomFieldGroupIds);

          baseCustomFieldGroupById = _.keyBy(baseCustomFieldGroups, 'id');

          const baseCustomFields = await CustomField.qm.getByBaseCustomFieldGroupIds(
            Object.keys(baseCustomFieldGroupById),
          );

          customFieldsByBaseCustomFieldGroupId = _.groupBy(
            baseCustomFields,
            'baseCustomFieldGroupId',
          );
        }

        let idsTotal = boardCustomFieldGroups.length + boardCustomFields.length;

        if (values.project) {
          idsTotal += basedCustomFieldGroups.reduce((result, customFieldGroup) => {
            const customFieldsItem =
              customFieldsByBaseCustomFieldGroupId[customFieldGroup.baseCustomFieldGroupId];

            return result + (customFieldsItem ? customFieldsItem.length : 0);
          }, 0);
        }

        const ids = await sails.helpers.utils.generateIds(idsTotal);

        const nextCustomFieldGroupIdByCustomFieldGroupId = {};
        const nextCustomFieldGroupsValues = boardCustomFieldGroups.map(
          (customFieldGroup, index) => {
            const id = ids.shift();
            nextCustomFieldGroupIdByCustomFieldGroupId[customFieldGroup.id] = id;

            const nextValues = {
              ..._.pick(customFieldGroup, ['baseCustomFieldGroupId', 'name']),
              id,
              cardId: inputs.record.id,
              position: POSITION_GAP * (index + 1),
            };

            if (values.project && customFieldGroup.baseCustomFieldGroupId) {
              nextValues.baseCustomFieldGroupId = null;

              if (!customFieldGroup.name) {
                nextValues.name =
                  baseCustomFieldGroupById[customFieldGroup.baseCustomFieldGroupId].name;
              }
            }

            return nextValues;
          },
        );

        const nextCustomFieldIdByCustomFieldId = {};
        const nextCustomFieldsValues = boardCustomFields.map((customField) => {
          const id = ids.shift();
          nextCustomFieldIdByCustomFieldId[customField.id] = id;

          return {
            ..._.pick(customField, ['name', 'showOnFrontOfCard', 'position']),
            id,
            customFieldGroupId:
              nextCustomFieldGroupIdByCustomFieldGroupId[customField.customFieldGroupId],
          };
        });

        if (values.project) {
          basedCustomFieldGroups.forEach((customFieldGroup) => {
            const customFieldsItem =
              customFieldsByBaseCustomFieldGroupId[customFieldGroup.baseCustomFieldGroupId];

            if (!customFieldsItem) {
              return;
            }

            customFieldsItem.forEach((customField) => {
              const id = ids.shift();
              nextCustomFieldIdByCustomFieldId[`${customFieldGroup.id}:${customField.id}`] = id;

              nextCustomFieldsValues.push({
                ..._.pick(customField, ['name', 'showOnFrontOfCard', 'position']),
                id,
                customFieldGroupId:
                  nextCustomFieldGroupIdByCustomFieldGroupId[customFieldGroup.id] ||
                  customFieldGroup.id,
              });
            });
          });
        }

        const customFieldGroupIds = boardCustomFieldGroupIds;
        if (values.project) {
          customFieldGroupIds.push(...sails.helpers.utils.mapRecords(basedCardCustomFieldGroups));
        }

        const customFieldValues = await CustomFieldValue.qm.getByCardId(inputs.record.id, {
          customFieldGroupIdOrIds: customFieldGroupIds,
        });

        try {
          card = await sails.getDatastore().transaction(async (db) => {
            // Keep every destructive transfer mutation on the same connection. If the final card
            // update (or any preceding mutation) fails, Waterline rolls the whole transfer back.
            // eslint-disable-next-line no-restricted-syntax
            for (const reposition of repositions) {
              // eslint-disable-next-line no-await-in-loop
              await Card.qm
                .updateOne(
                  {
                    id: reposition.record.id,
                    listId: reposition.record.listId,
                  },
                  {
                    position: reposition.position,
                  },
                )
                .usingConnection(db);
            }

            await CardSubscription.qm
              .delete({
                cardId: inputs.record.id,
                userId: {
                  '!=': boardMemberUserIds,
                },
              })
              .usingConnection(db);

            await CardMembership.qm
              .delete({
                cardId: inputs.record.id,
                userId: {
                  '!=': boardMemberUserIds,
                },
              })
              .usingConnection(db);

            await CardLabel.qm
              .delete({
                cardId: inputs.record.id,
              })
              .usingConnection(db);

            await Promise.all(
              labelRepositions.map((reposition) =>
                Label.qm
                  .updateOne(reposition.record.id, {
                    position: reposition.position,
                  })
                  .usingConnection(db),
              ),
            );

            createdLabels = await Promise.all(
              positionedNextLabelValues.map((nextLabel) =>
                Label.qm.createOne(nextLabel).usingConnection(db),
              ),
            );

            if (nextLabelIds.length > 0) {
              await CardLabel.qm
                .create(
                  nextLabelIds.map((labelId) => ({
                    labelId,
                    cardId: inputs.record.id,
                  })),
                )
                .usingConnection(db);
            }

            await Task.qm
              .update(
                {
                  taskListId: taskListIds,
                  assigneeUserId: {
                    '!=': boardMemberUserIds,
                  },
                },
                {
                  assigneeUserId: null,
                },
              )
              .usingConnection(db);

            if (nextCustomFieldGroupsValues.length > 0) {
              const { position } =
                nextCustomFieldGroupsValues[nextCustomFieldGroupsValues.length - 1];

              await Promise.all(
                cardCustomFieldGroups.map((customFieldGroup) =>
                  CustomFieldGroup.qm
                    .updateOne(customFieldGroup.id, {
                      position: customFieldGroup.position + position,
                    })
                    .usingConnection(db),
                ),
              );
            }

            await CustomFieldGroup.qm.create(nextCustomFieldGroupsValues).usingConnection(db);

            if (values.project) {
              await CustomFieldGroup.qm
                .update(
                  {
                    cardId: inputs.record.id,
                    baseCustomFieldGroupId: {
                      '!=': null,
                    },
                  },
                  {
                    baseCustomFieldGroupId: null,
                  },
                )
                .usingConnection(db);

              const unnamedCustomFieldGroups = basedCardCustomFieldGroups.filter(
                ({ name }) => !name,
              );

              await Promise.all(
                unnamedCustomFieldGroups.map((customFieldGroup) =>
                  CustomFieldGroup.qm
                    .updateOne(customFieldGroup.id, {
                      name: baseCustomFieldGroupById[customFieldGroup.baseCustomFieldGroupId].name,
                    })
                    .usingConnection(db),
                ),
              );
            }

            await CustomField.qm.create(nextCustomFieldsValues).usingConnection(db);

            await Promise.all(
              customFieldValues.map((customFieldValue) => {
                const updateValues = {
                  customFieldGroupId:
                    nextCustomFieldGroupIdByCustomFieldGroupId[customFieldValue.customFieldGroupId],
                };

                const nextCustomFieldId =
                  nextCustomFieldIdByCustomFieldId[
                    `${customFieldValue.customFieldGroupId}:${customFieldValue.customFieldId}`
                  ] || nextCustomFieldIdByCustomFieldId[customFieldValue.customFieldId];

                if (nextCustomFieldId) {
                  updateValues.customFieldId = nextCustomFieldId;
                }

                return CustomFieldValue.qm
                  .updateOne(customFieldValue.id, updateValues)
                  .usingConnection(db);
              }),
            );

            const updatedCard = await Card.qm
              .updateOne(inputs.record.id, values)
              .usingConnection(db);

            if (!updatedCard) {
              throw CARD_UPDATE_MISSED;
            }

            return updatedCard;
          });
        } catch (error) {
          if (error !== CARD_UPDATE_MISSED) {
            throw error;
          }

          card = null;
        }
      } else {
        card = await Card.qm.updateOne(inputs.record.id, values);
      }

      if (!card) {
        return card;
      }

      if (values.board) {
        repositions.forEach((reposition) => {
          sails.sockets.broadcast(`board:${board.id}`, 'cardUpdate', {
            item: {
              id: reposition.record.id,
              position: reposition.position,
            },
          });

          // TODO: send webhooks
        });

        labelRepositions.forEach((reposition) => {
          sails.sockets.broadcast(`board:${board.id}`, 'labelUpdate', {
            item: {
              id: reposition.record.id,
              position: reposition.position,
            },
          });
        });

        createdLabels.forEach((label) => {
          sails.sockets.broadcast(`board:${label.boardId}`, 'labelCreate', {
            item: label,
          });

          sails.helpers.utils.sendWebhooks.with({
            event: 'labelCreate',
            buildData: () => ({
              item: label,
              included: {
                projects: [project],
                boards: [board],
              },
            }),
            user: inputs.actorUser,
          });
        });

        sails.sockets.broadcast(
          `board:${inputs.board.id}`,
          'cardUpdate',
          {
            item: {
              id: card.id,
              boardId: null,
            },
          },
          inputs.request,
        );

        sails.sockets.broadcast(`board:${card.boardId}`, 'cardUpdate', {
          item: card,
        });

        // TODO: add transfer action
      } else {
        sails.sockets.broadcast(
          `board:${card.boardId}`,
          'cardUpdate',
          {
            item: card,
          },
          inputs.request,
        );

        if (values.list) {
          try {
            await sails.helpers.actions.createOne.with({
              values: {
                card,
                type: Action.Types.MOVE_CARD,
                data: {
                  card: _.pick(card, ['name']),
                  fromList: _.pick(inputs.list, ['id', 'type', 'name']),
                  toList: _.pick(values.list, ['id', 'type', 'name']),
                },
                user: inputs.actorUser,
              },
              project: inputs.project,
              board: inputs.board,
              list: values.list,
            });
          } catch (error) {
            sails.log.error(`Failed to create move action for card ${card.id}:`, error);
          }
        }

        // Criar atividade para alteração de data de vencimento
        if ('dueDate' in values && values.dueDate !== inputs.record.dueDate) {
          try {
            await sails.helpers.actions.createOne.with({
              values: {
                card,
                type: Action.Types.SET_DUE_DATE,
                data: {
                  card: _.pick(card, ['name']),
                  oldDueDate: inputs.record.dueDate,
                  newDueDate: values.dueDate,
                },
                user: inputs.actorUser,
              },
              project: inputs.project,
              board: inputs.board,
              list: values.list || inputs.list,
            });
          } catch (error) {
            sails.log.error(`Failed to create due date action for card ${card.id}:`, error);
          }
        }
      }

      sails.helpers.utils.sendWebhooks.with({
        event: 'cardUpdate',
        buildData: () => ({
          item: card,
          included: {
            projects: [project],
            boards: [board],
            lists: [list],
          },
        }),
        buildPrevData: () => ({
          item: inputs.record,
          included: {
            projects: [inputs.project],
            boards: [inputs.board],
            lists: [inputs.list],
          },
        }),
        user: inputs.actorUser,
      });
    }

    if (!_.isUndefined(isSubscribed)) {
      const wasSubscribed = await sails.helpers.users.isCardSubscriber(
        inputs.actorUser.id,
        card.id,
      );

      if (isSubscribed !== wasSubscribed) {
        if (isSubscribed) {
          try {
            await CardSubscription.qm.createOne({
              cardId: card.id,
              userId: inputs.actorUser.id,
            });
          } catch (error) {
            if (error.code !== 'E_UNIQUE') {
              throw error;
            }
          }
        } else {
          await CardSubscription.qm.deleteOne({
            cardId: card.id,
            userId: inputs.actorUser.id,
          });
        }

        sails.sockets.broadcast(
          `user:${inputs.actorUser.id}`,
          'cardUpdate',
          {
            item: {
              isSubscribed,
              id: card.id,
            },
          },
          inputs.request,
        );

        // TODO: send webhooks
      }
    }

    return card;
  },
};
