import Image from "next/image";
import chairPersonOne from "../assets/Chairs/3.png";
import chairPersonTwo from "../assets/Chairs/4.png";
import chairPersonThree from "../assets/Chairs/5.png";
import galleryPhotoOne from "../assets/gallery grid/539132418_1173273001499008_4701588952681775030_n.jpg";
import galleryPhotoTwo from "../assets/gallery grid/538314147_1173265281499780_317201833541306729_n.jpg";
import galleryPhotoThree from "../assets/gallery grid/538165580_1173265591499749_97311428003324323_n.jpg";
import galleryPhotoFour from "../assets/gallery grid/538078216_1173265738166401_7069821215011233465_n.jpg";
import galleryPhotoFive from "../assets/gallery grid/538078210_1173276281498680_1990912075319500458_n.jpg";
import galleryPhotoSix from "../assets/gallery grid/537748319_1173274288165546_2091514994446013539_n.jpg";
import galleryPhotoSeven from "../assets/gallery grid/DSC00265.jpg";
import galleryPhotoEight from "../assets/gallery grid/DSC00098.jpg";
import galleryPhotoNine from "../assets/gallery grid/539533846_1173270468165928_5772779015697458410_n.jpg";
import galleryPhotoTen from "../assets/gallery grid/new cf2024-0027.jpg";
import galleryPhotoEleven from "../assets/gallery grid/DSC00654.jpg";
import galleryPhotoTwelve from "../assets/gallery grid/new cf2024-0082.jpg";
import ieeeSbWhiteLogo from "../assets/UOM IEEE SB LOGO - WHITE.png";
import AboutStory from "./about-story";
import EventTimeline from "./event-timeline";
import Preloader from "./preloader";
import RegistrationComingSoonButton from "./registration-coming-soon-button";
import RotatingHeadline from "./rotating-headline";
import SiteBackground from "./site-background";
import SiteHeader from "./site-header";
import HeroCandidateAction from "./hero-candidate-action";

const partnershipTiers = [
  {
    name: "Platinum Partner",
    label: "Flagship presence",
    description:
      "Lead the Rise Up Mora 2026 industry experience with maximum visibility across student touchpoints.",
    benefits: [
      "Premium brand placement",
      "Priority session opportunities",
      "Featured fair presence",
    ],
  },
  {
    name: "Gold Partner",
    label: "High-impact engagement",
    description:
      "Connect directly with career-ready undergraduates through focused exposure and event participation.",
    benefits: [
      "Prominent event visibility",
      "Workshop collaboration",
      "Recruitment fair access",
    ],
  },
  {
    name: "Silver Partner",
    label: "Focused reach",
    description:
      "Build meaningful awareness among motivated students while supporting their professional growth.",
    benefits: [
      "Partner recognition",
      "Student network access",
      "Digital promotion support",
    ],
  },
  {
  name: "Bronze Partner",
  label: "Brand Visibility",
  description:
    "Increase your brand presence by engaging with aspiring professionals through event-wide recognition and promotional opportunities.",
  benefits: [
    "Logo on event promotional materials",
    "Recognition on social media platforms",
    "Brand visibility during the event",
  ],
},
{
  name: "Stall Partner",
  label: "Direct Engagement",
  description:
    "Connect directly with students through an on-site exhibition stall, showcasing your brand, products, services, and career opportunities.",
  benefits: [
    "Dedicated exhibition stall",
    "Direct interaction with attendees",
    "Opportunity to distribute promotional materials",
  ],
}
] as const;

const galleryCards = [
  galleryPhotoOne,
  galleryPhotoTwo,
  galleryPhotoThree,
  galleryPhotoFour,
  galleryPhotoFive,
  galleryPhotoSix,
  galleryPhotoSeven,
  galleryPhotoEight,
  galleryPhotoNine,
  galleryPhotoTen,
  galleryPhotoEleven,
  galleryPhotoTwelve,
].map((image, index) => ({
  image,
  alt: `Rise Up Mora gallery moment ${String(index + 1).padStart(2, "0")}`,
}));

const chairPersons = [
  {
    name: "Imesh Munasinghe",
    role: "Event Chairperson",
    image: chairPersonOne,
  },
  {
    name: "Yashini Gunasekara",
    role: "Event Vice Chairperson",
    image: chairPersonTwo,
  },
  {
    name: "Thamalu Bambaravanage",
    role: "Event Vice Chairperson",
    image: chairPersonThree,
  },
] as const;

const footerSocialLinks = [
  { label: "Facebook", shortLabel: "Fb", href: "https://www.facebook.com/ieeesbuom" },
  { label: "LinkedIn", shortLabel: "In", href: "https://www.linkedin.com/company/ieeesbuom/" },
  { label: "IEEE SB UoM", shortLabel: "Web", href: "https://ieeesb.uom.lk/" },
] as const;

const footerQuickLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Timeline", href: "#timeline" },
  { label: "Partners", href: "#partner" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
] as const;

const footerEvents = [
  {
    title: "Registrations Opening",
    date: "July 27th, 2026",
  },
  // {
  //   title: "Registrations Closing",
  //   date: "July th, 2026",
  // },
  {
    title: "Internship & Mock Interview Fair",
    date: "August 6th, 2026",
  },
] as const;

export default function Home() {
  return (
    <div className="home-page">
      <Preloader />
      <SiteBackground />
      <SiteHeader />

      <main>
        <section className="home-hero" id="home">
          <div className="hero-copy">
            <p className="hero-eyebrow">University of Moratuwa</p>
            <RotatingHeadline />
            <p className="hero-description">
              A transformative initiative by the IEEE Student Branch at the
              University of Moratuwa, empowering undergraduates with industry
              insights, professional skills, and interview preparation through
              expert-led webinars and workshops.
            </p>
            <div className="hero-actions">
              <HeroCandidateAction />
              <a className="hero-secondary" href="#timeline">
                View timeline
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orbit hero-orbit--outer" />
            <div className="hero-orbit hero-orbit--inner" />
            <div className="hero-brand-mark">
              <Image
                className="hero-visual-logo"
                src="/assets/rise-up-mora-logo.png"
                alt=""
                width={830}
                height={535}
                loading="eager"
                sizes="(max-width: 48rem) 72vw, 23rem"
              />
            </div>
            <span className="hero-year">2026</span>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-intro">
            <p className="about-kicker">IEEE Student Branch Leadership</p>
            <h2>Rise Up Mora?</h2>
            <div className="about-rule" aria-hidden="true" />
            <p className="about-description">
              Rise Up Mora is an award-winning, large-scale initiative, proudly
              organized by the IEEE Student Branch of the University of Moratuwa.
              Ever since its inception in 2021, Rise Up Mora has been the most
              awaited Internship Focused Career Development Experience at the
              University of Moratuwa.
            </p>
            <p className="about-description">
              The key highlight behind this anticipation is the signature Internship
              and Mock Interview Fair, which brings together over 5,000 undergraduates
              from the best technological university in Sri Lanka alongside the
              country&apos;s leading industry giants on one powerful platform.
            </p>
            <p className="about-description">
              Having made an unmatched impact for six consecutive years, Rise Up Mora
              has established a deeply trusted reputation, not only among the
              University of Moratuwa undergraduates but also among the entire IEEE
              Student Branch community in Sri Lanka, well-evident by the number of
              awards it has won over the years.
            </p>
            <p className="about-description">
              Having made a significant impact over the years, Rise Up Mora continues
              its mission of shaping talented undergraduates into career-ready
              professionals while serving as the ultimate bridge that connects Sri
              Lanka&apos;s best talents with the country&apos;s most influential corporate
              companies.
            </p>
            <div className="about-actions">
              <a className="about-primary" href="#contact">
                Join our community <span aria-hidden="true">→</span>
              </a>
              <a className="about-secondary" href="#timeline">
                Explore the journey <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <AboutStory />

          <div className="about-metrics" aria-label="Rise Up Mora impact">
            <div>
              <strong>20+</strong>
              <span>Expert webinars</span>
            </div>
            <div>
              <strong>3500+</strong>
              <span>Mock interviews</span>
            </div>
            <div>
              <strong>50+</strong>
              <span>Companies</span>
            </div>
            <p>
              One growing network of students, mentors, and industry leaders.
            </p>
          </div>
        </section>

        <EventTimeline />

        <section className="partner-tiers" id="partner">
          <div className="partner-tiers__intro">
            <p>Partner with us</p>
            <h2>Partnership Tiers</h2>
            <span>
              Choose the level of engagement that matches your organization&apos;s
              hiring goals, brand presence, and commitment to developing the next
              generation of industry-ready talent.
            </span>
          </div>

          <div className="partner-tier-grid">
            {partnershipTiers.map((tier, index) => (
              <article className="partner-tier-card" key={tier.name}>
                <div className="partner-tier-card__topline">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <small>{tier.label}</small>
                </div>
                <h3>{tier.name}</h3>
                <p>{tier.description}</p>
                <ul>
                  {tier.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
                <a href="#contact">
                  Discuss this tier <span aria-hidden="true">-&gt;</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="gallery-section" id="gallery">
          <div className="gallery-heading">
            <p>Gallery</p>
            <h2>Moments from Rise Up Mora</h2>
          </div>

          <div className="gallery-grid" aria-label="Rise Up Mora gallery">
            {galleryCards.map((card, index) => (
              <article
                className={`gallery-card gallery-card--${index + 1}`}
                key={card.alt}
              >
                <Image
                  className="gallery-card__image"
                  src={card.image}
                  alt={card.alt}
                  placeholder="blur"
                  sizes="(max-width: 48rem) 50vw, (max-width: 62rem) 25vw, 21rem"
                />
              </article>
            ))}
          </div>
        </section>

        <section className="chair-section" id="chairpersons">
          <div className="chair-heading">
            <p>Event Leadership</p>
            <h2>Event Chairpersons</h2>
          </div>

          <div className="chair-grid">
            {chairPersons.map((person) => (
              <article className="chair-card" key={person.name}>
                <div className="chair-card__image">
                  <Image
                    src={person.image}
                    alt={person.name}
                    sizes="(max-width: 48rem) 88vw, (max-width: 62rem) 28vw, 22rem"
                  />
                </div>
                <div className="chair-card__content">
                  <span>{person.role}</span>
                  <h3>{person.name}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>

      </main>

      <footer className="site-footer" id="contact">
        <div className="site-footer__inner">
          <section className="site-footer__brand" aria-label="IEEE Student Branch UoM">
            <div className="site-footer__brand-titles">
              <h2 className="text-left">IEEE Student Branch</h2>
              <span className="site-footer__brand-divider">·</span>
              <h2 className="text-left">University of Moratuwa</h2>
            </div>
            <Image
              className="site-footer__logo"
              src={ieeeSbWhiteLogo}
              alt="UoM IEEE Student Branch"
              sizes="(max-width: 48rem) 12rem, 14rem"
            />
            <p>
              The Institute of Electrical and Electronics Engineers (IEEE)
              Student Branch at University of Moratuwa is dedicated to fostering
              innovation and technological excellence.
            </p>
            <div className="site-footer__socials">
              {footerSocialLinks.map((link) => (
                <a
                  aria-label={link.label}
                  href={link.href}
                  key={link.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.shortLabel}
                </a>
              ))}
            </div>
          </section>

          <nav className="site-footer__links" aria-label="Footer quick links">
            <h3>Quick Links</h3>
            <ul>
              {footerQuickLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <section className="site-footer__events" aria-label="Upcoming events">
            <h3>Upcoming Events</h3>
            <div>
              {footerEvents.map((event) => (
                <article key={event.title}>
                  <h4>{event.title}</h4>
                  <p>{event.date}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="site-footer__bottom">
          <p>© 2026 IEEE Student Branch, University of Moratuwa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
