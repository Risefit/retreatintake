import '../styles/globals.css';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Wyrd Pharm — Retreat Intake</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0D100E" />
        <meta name="description" content="Pre-retreat intake questionnaire for Wyrd Pharm guests." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
