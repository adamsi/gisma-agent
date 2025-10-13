import { Html, Head, Main, NextScript, DocumentProps } from 'next/document';
import i18nextConfig from '../next-i18next.config';

type Props = DocumentProps & {
  // add custom document props
};

export default function Document(props: Props) {
  const currentLocale =
    props.__NEXT_DATA__.locale ?? i18nextConfig.i18n.defaultLocale;
  return (
    <Html lang={currentLocale}>
      <Head>
        <title>Legal Copilot</title>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Legal Copilot"></meta>
        <link rel="icon" type="image/png" href="/lc-logo.png" />
        <link rel="shortcut icon" type="image/png" href="/lc-logo.png" />
        <link rel="apple-touch-icon" href="/lc-logo.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
