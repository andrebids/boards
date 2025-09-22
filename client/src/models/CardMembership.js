import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'CardMembership';

  static fields = {
    id: attr(),
    cardId: fk({
      to: 'Card',
      as: 'card',
      relatedName: 'cardMemberships',
    }),
    userId: fk({
      to: 'User',
      as: 'user',
      relatedName: 'userCardMemberships',
    }),
  };

  static reducer({ type, payload }, CardMembership) {
    switch (type) {
      case ActionTypes.CARD_USER_ADD__SUCCESS:
        CardMembership.upsert(payload.cardMembership);
        break;
      default:
    }
  }
}
