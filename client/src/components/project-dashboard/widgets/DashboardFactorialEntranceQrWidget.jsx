import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

import styles from './DashboardFactorialEntranceQrWidget.module.scss';

const FACTORIAL_ENTRANCE_URL =
  'https://bids.factorialhr.pt/entrance?token=eyJhbGciOiJIUzI1NiJ9.IjI3MjAxMSI._EtXySSKTGegvGbGJJ2nrK9dhy8GF4_1wxtU8FJcx1g';

const DashboardFactorialEntranceQrWidget = React.memo(() => (
  <section className={styles.wrapper} aria-label="Código QR para a entrada Factorial">
    <a
      aria-label="Abrir entrada Factorial"
      className={styles.link}
      href={FACTORIAL_ENTRANCE_URL}
      rel="noreferrer"
      target="_blank"
    >
      <QRCodeSVG
        className={styles.qrCode}
        level="M"
        marginSize={4}
        size={256}
        title="Código QR para a entrada Factorial"
        value={FACTORIAL_ENTRANCE_URL}
      />
    </a>
  </section>
));

export default DashboardFactorialEntranceQrWidget;
