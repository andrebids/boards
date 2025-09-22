import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'CardLabel';

  static fields = {
    id: attr(),
    cardId: fk({
      to: 'Card',
      as: 'card',
      relatedName: 'cardLabels',
    }),
    labelId: fk({
      to: 'Label',
      as: 'label',
      relatedName: 'cardLabels',
    }),
  };

  static reducer({ type, payload }, CardLabel) {
    switch (type) {
      case ActionTypes.CARD_LABEL_ADD__SUCCESS:
        CardLabel.upsert(payload.cardLabel);
        break;
      default:
    }
  }
}
