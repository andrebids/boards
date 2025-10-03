/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    event: {
      type: 'string',
      required: true,
    },
    data: {
      type: 'json',
      required: true,
    },
  },

  async fn(inputs) {
    // Query otimizada: buscar apenas IDs de admins/project owners
    // Sem precisar carregar todos os campos do utilizador
    const admins = await User.find({
      select: ['id'],
      where: {
        or: [
          { role: User.Roles.ADMIN },
          { role: User.Roles.PROJECT_OWNER },
        ],
      },
    });

    // Broadcast assíncrono (não esperar por cada socket)
    admins.forEach((admin) => {
      sails.sockets.broadcast(
        `user:${admin.id}`,
        inputs.event,
        inputs.data
      );
    });

    return admins.length;
  },
};


