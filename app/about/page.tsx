import { Header } from "@/components/header";
import { isDemo } from "@/lib/config";
import Link from "next/link";
export const metadata = { title: "A city of possibilities" };
export default function Page() {
  return (
    <>
      <Header demo={isDemo()} />
      <main className="about-page">
        <span className="eyebrow">A LITTLE CITY. BIG POSSIBILITIES.</span>
        <h1>A home for your next big idea.</h1>
        <p>
          SkyCity is a fictional, explorable city where every building is an
          opportunity to be discovered. Independent brands, side projects, local
          businesses and personal ideas all have a place here.
        </p>
        <h2>Explore. Claim. Make it yours.</h2>
        <p>
          Choose a building, add your name and colors, and claim a temporary
          advertising placement. One building hosts one advertiser at a time.
          Your price and duration are shown before checkout, and there are no
          automatic recurring charges.
        </p>
        <h2>Your email is your key.</h2>
        <p>
          No account forms or passwords. Use the email from your checkout to
          request a secure link from My Buildings. Update your advertisement,
          see its activity, renew your stay or share your address.
        </p>
        <h2>A good neighborhood starts with good neighbors.</h2>
        <p>
          You must have permission to use the names, logos and images in your
          advertisement. Illegal, deceptive or harmful content may be suspended.
          A claim is a temporary advertising lease, not ownership of real estate
          or an investment.
        </p>
        {isDemo() && (
          <div className="inline-notice">
            You are exploring a demo city. Fictional brands and historical
            activity are labeled as demo data. Payments and emails are
            simulated.
          </div>
        )}
        <Link href="/" className="button coral">
          Find your place ↗
        </Link>
      </main>
    </>
  );
}
