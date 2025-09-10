/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

module.exports.bootstrap = async () => {
  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return;
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

  // Log de inicialização para o sistema de notificações globais
  if (sails.config.custom.globalNotifications && sails.config.custom.globalNotifications.enabled) {
    const config = sails.config.custom.globalNotifications.nodemailer;
    sails.log.info('✅ [GLOBAL_NOTIFICATIONS] Sistema de notificações globais ATIVADO.');
    sails.log.info(`   - Host SMTP: ${config.host} | Porta: ${config.port}`);
    sails.log.info(`   - Utilizador SMTP: ${config.auth.user}`);
    if (sails.config.custom.globalNotifications.recipients) {
      sails.log.info(
        `   - Destinatários: Apenas os seguintes endereços -> ${sails.config.custom.globalNotifications.recipients.join(
          ', ',
        )}`,
      );
    } else {
      sails.log.info('   - Destinatários: Emails dos utilizadores notificados.');
    }
  } else {
    sails.log.info('❕ [GLOBAL_NOTIFICATIONS] Sistema de notificações globais DESATIVADO.');
  }
};
