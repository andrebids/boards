/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

const path = require('path');
const { URL } = require('url');

const version = require('../version');
const { parseWebPushConfig } = require('../utils/web-push-config');

const envToNumber = (value) => {
  const number = parseInt(value, 10);
  return Number.isNaN(number) ? null : number;
};

const envToArray = (value) => (value ? value.split(',') : []);

const envToPositiveNumber = (value, defaultValue) => {
  const number = envToNumber(value);
  return number && number > 0 ? number : defaultValue;
};

const parsedBasedUrl = new URL(process.env.BASE_URL);
const designAttachmentMaxBytes = envToPositiveNumber(
  process.env.DESIGN_ATTACHMENT_MAX_BYTES,
  500 * 1024 * 1024,
);
const attachmentMaxBytes = envToPositiveNumber(process.env.ATTACHMENT_MAX_BYTES, 500 * 1024 * 1024);
const psdAttachmentMaxBytes = envToPositiveNumber(
  process.env.PSD_ATTACHMENT_MAX_BYTES,
  1024 * 1024 * 1024,
);
const threeDAttachmentMaxBytes = envToPositiveNumber(
  process.env.THREE_D_ATTACHMENT_MAX_BYTES,
  1024 * 1024 * 1024,
);
const webPush = parseWebPushConfig(process.env);

module.exports.custom = {
  /**
   *
   * Any other custom config this Sails app should use during development.
   *
   */

  version,

  baseUrl: process.env.BASE_URL,
  baseUrlPath: parsedBasedUrl.pathname,
  baseUrlSecure: parsedBasedUrl.protocol === 'https:',

  tokenExpiresIn: parseInt(process.env.TOKEN_EXPIRES_IN, 10) || 365,

  codexUsageBridgeToken: process.env.CODEX_USAGE_BRIDGE_TOKEN,

  passwordResetEnabled: process.env.PASSWORD_RESET_ENABLED !== 'false',
  passwordResetTokenExpiresInMinutes: envToPositiveNumber(
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
    30,
  ),
  passwordResetPollIntervalSeconds: envToPositiveNumber(
    process.env.PASSWORD_RESET_POLL_INTERVAL_SECONDS,
    5,
  ),
  passwordResetMaxAttempts: envToPositiveNumber(process.env.PASSWORD_RESET_MAX_ATTEMPTS, 3),

  // Location to receive uploaded files in. Default (non-string value) is a Sails-specific location.
  uploadsTempPath: null,
  uploadsBasePath: path.resolve(__dirname, '..'),

  preloadedFaviconsPathSegment: 'public/preloaded-favicons',
  faviconsPathSegment: 'public/favicons',
  userAvatarsPathSegment: 'public/user-avatars',
  backgroundImagesPathSegment: 'public/background-images',
  attachmentsPathSegment: 'private/attachments',

  attachmentMaxBytes,

  designAttachmentMaxBytes,
  psdAttachmentMaxBytes,
  threeDAttachmentMaxBytes,

  videoAttachmentMaxBytes: envToPositiveNumber(
    process.env.VIDEO_ATTACHMENT_MAX_BYTES,
    500 * 1024 * 1024,
  ),

  archiveAttachmentMaxBytes: envToPositiveNumber(
    process.env.ARCHIVE_ATTACHMENT_MAX_BYTES,
    500 * 1024 * 1024,
  ),

  chatAttachmentMaxBytes: envToPositiveNumber(
    process.env.CHAT_ATTACHMENT_MAX_BYTES,
    attachmentMaxBytes,
  ),
  chatAttachmentsPerMessageLimit: envToPositiveNumber(
    process.env.CHAT_ATTACHMENTS_PER_MESSAGE_LIMIT,
    10,
  ),
  chatExternalLinkPreviewsEnabled: process.env.CHAT_EXTERNAL_LINK_PREVIEWS_ENABLED === 'true',
  chatEmailNotificationsEnabled: process.env.CHAT_EMAIL_NOTIFICATIONS_ENABLED === 'true',
  chatEmailNotificationDelaySeconds: envToPositiveNumber(
    process.env.CHAT_EMAIL_NOTIFICATION_DELAY_SECONDS,
    30 * 60,
  ),
  chatEmailNotificationPollIntervalSeconds: envToPositiveNumber(
    process.env.CHAT_EMAIL_NOTIFICATION_POLL_INTERVAL_SECONDS,
    60,
  ),
  chatEmailNotificationMaxBatchesPerRun: envToPositiveNumber(
    process.env.CHAT_EMAIL_NOTIFICATION_MAX_BATCHES_PER_RUN,
    100,
  ),
  chatEmailNotificationMaxAttempts: envToPositiveNumber(
    process.env.CHAT_EMAIL_NOTIFICATION_MAX_ATTEMPTS,
    5,
  ),

  webPush,

  videoProcessingEnabled: process.env.VIDEO_PROCESSING_ENABLED !== 'false',
  videoProcessingPollIntervalSeconds: envToPositiveNumber(
    process.env.VIDEO_PROCESSING_POLL_INTERVAL_SECONDS,
    5,
  ),
  videoProcessingMaxJobsPerRun: envToPositiveNumber(
    process.env.VIDEO_PROCESSING_MAX_JOBS_PER_RUN,
    1,
  ),
  videoProcessingMaxAttempts: envToPositiveNumber(process.env.VIDEO_PROCESSING_MAX_ATTEMPTS, 3),

  projectPresentationPreviewEnabled: process.env.PROJECT_PRESENTATION_PREVIEW_ENABLED !== 'false',
  projectPresentationPreviewPollIntervalSeconds: envToPositiveNumber(
    process.env.PROJECT_PRESENTATION_PREVIEW_POLL_INTERVAL_SECONDS,
    5,
  ),
  projectPresentationPreviewMaxJobsPerRun: envToPositiveNumber(
    process.env.PROJECT_PRESENTATION_PREVIEW_MAX_JOBS_PER_RUN,
    1,
  ),
  projectPresentationPreviewMaxAttempts: envToPositiveNumber(
    process.env.PROJECT_PRESENTATION_PREVIEW_MAX_ATTEMPTS,
    3,
  ),
  projectPresentationPreviewCommandTimeoutMs: envToPositiveNumber(
    process.env.PROJECT_PRESENTATION_PREVIEW_COMMAND_TIMEOUT_MS,
    30000,
  ),

  defaultAdminEmail:
    process.env.DEFAULT_ADMIN_EMAIL && process.env.DEFAULT_ADMIN_EMAIL.toLowerCase(),

  activeUsersLimit: envToNumber(process.env.ACTIVE_USERS_LIMIT),
  showDetailedAuthErrors: process.env.SHOW_DETAILED_AUTH_ERRORS === 'true',

  s3Endpoint: process.env.S3_ENDPOINT,
  s3Region: process.env.S3_REGION,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  s3Bucket: process.env.S3_BUCKET,
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',

  oidcIssuer: process.env.OIDC_ISSUER,
  oidcClientId: process.env.OIDC_CLIENT_ID,
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET,
  oidcIdTokenSignedResponseAlg: process.env.OIDC_ID_TOKEN_SIGNED_RESPONSE_ALG,
  oidcUserinfoSignedResponseAlg: process.env.OIDC_USERINFO_SIGNED_RESPONSE_ALG,
  oidcScopes: process.env.OIDC_SCOPES || 'openid email profile',
  oidcResponseMode: process.env.OIDC_RESPONSE_MODE || 'fragment',
  oidcUseDefaultResponseMode: process.env.OIDC_USE_DEFAULT_RESPONSE_MODE === 'true',
  oidcAdminRoles: envToArray(process.env.OIDC_ADMIN_ROLES),
  oidcProjectOwnerRoles: envToArray(process.env.OIDC_PROJECT_OWNER_ROLES),
  oidcBoardUserRoles: envToArray(process.env.OIDC_BOARD_USER_ROLES),
  oidcClaimsSource: process.env.OIDC_CLAIMS_SOURCE || 'userinfo',
  oidcEmailAttribute: process.env.OIDC_EMAIL_ATTRIBUTE || 'email',
  oidcNameAttribute: process.env.OIDC_NAME_ATTRIBUTE || 'name',
  oidcUsernameAttribute: process.env.OIDC_USERNAME_ATTRIBUTE || 'preferred_username',
  oidcRolesAttribute: process.env.OIDC_ROLES_ATTRIBUTE || 'groups',
  oidcIgnoreUsername: process.env.OIDC_IGNORE_USERNAME === 'true',
  oidcIgnoreRoles: process.env.OIDC_IGNORE_ROLES === 'true',
  oidcEnforced: process.env.OIDC_ENFORCED === 'true',

  // TODO: move client base url to environment variable?
  oidcRedirectUri: `${
    process.env.NODE_ENV === 'production' ? process.env.BASE_URL : 'http://localhost:3008'
  }/oidc-callback`,

  smtpHost: process.env.SMTP_HOST || process.env.GLOBAL_SMTP_HOST,
  smtpPort: process.env.SMTP_PORT || process.env.GLOBAL_SMTP_PORT || 587,
  smtpName: process.env.SMTP_NAME,
  smtpSecure: (process.env.SMTP_SECURE || process.env.GLOBAL_SMTP_SECURE) === 'true',
  smtpUser: process.env.SMTP_USER || process.env.GLOBAL_SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD || process.env.GLOBAL_SMTP_PASSWORD,
  smtpFrom: process.env.SMTP_FROM || process.env.GLOBAL_SMTP_FROM,
  smtpTlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',

  webhooks: JSON.parse(process.env.WEBHOOKS || '[]'), // TODO: validate structure

  // Configuração de notificações globais
  globalNotifications: {
    enabled: process.env.GLOBAL_NOTIFICATIONS_ENABLED === 'true',
    nodemailer: {
      host: process.env.GLOBAL_SMTP_HOST,
      port: parseInt(process.env.GLOBAL_SMTP_PORT, 10) || 587,
      secure: process.env.GLOBAL_SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.GLOBAL_SMTP_USER,
        pass: process.env.GLOBAL_SMTP_PASSWORD,
      },
      from: process.env.GLOBAL_SMTP_FROM,
      // Configurações avançadas do Nodemailer
      pool: true, // Connection pooling
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000, // 20 segundos
      rateLimit: 5, // 5 emails por rateDelta
      // TLS/SSL
      tls: {
        rejectUnauthorized: false, // Para desenvolvimento
        ciphers: 'SSLv3',
      },
      // Debug (apenas em desenvolvimento)
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    },
    recipients: process.env.GLOBAL_NOTIFICATION_RECIPIENTS
      ? process.env.GLOBAL_NOTIFICATION_RECIPIENTS.split(',').map((email) => email.trim())
      : null,
  },
};
