import { attr, Model } from 'redux-orm';

import ActionTypes from '../constants/ActionTypes';

export default class OrganizationDefaultLabel extends Model {
  static modelName = 'OrganizationDefaultLabel';

  static fields = {
    id: attr(),
    name: attr(),
    color: attr(),
    description: attr(),
    position: attr(),
    createdAt: attr(),
    updatedAt: attr(),
  };

  static reducer({ type, payload }, OrganizationDefaultLabel) {
    switch (type) {
      case ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH__SUCCESS:
        payload.items.forEach((item) => {
          OrganizationDefaultLabel.upsert(item);
        });
        break;

      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE__SUCCESS:
      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE_HANDLE:
      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE__SUCCESS:
      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE_HANDLE:
        OrganizationDefaultLabel.upsert(payload.item);
        break;

      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE__SUCCESS:
      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE_HANDLE:
        if (OrganizationDefaultLabel.idExists(payload.item.id)) {
          OrganizationDefaultLabel.withId(payload.item.id).delete();
        }
        break;

      case ActionTypes.ORGANIZATION_DEFAULT_LABELS_REORDER__SUCCESS:
        payload.items.forEach((item) => {
          OrganizationDefaultLabel.upsert(item);
        });
        break;

      default:
    }
  }
}

