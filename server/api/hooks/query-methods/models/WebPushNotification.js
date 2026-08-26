/*! Copyright (c) 2024 PLANKA Software GmbH */

// The outbox is processed with explicit native SQL helpers and currently needs
// no shared Waterline query methods. Export an object so the query-methods hook
// recognizes the model without emitting a startup error.
module.exports = {};
