import { ExternalLink } from "lucide-react";

type CompanyGuideRow = {
  /** Must match the company name stored in the database, so students can
   *  cross-reference this table against the preference dropdowns. */
  name: string;
  type: string;
  website: string;
};

/**
 * Static reference table shown at the bottom of the CV upload and dashboard
 * pages. Front-end only — this is deliberately not read from the database.
 * Industry descriptions and links were compiled from public company sources.
 */
const companyGuide: CompanyGuideRow[] = [
  {
    name: "Ceylon Tobacco Company",
    type: "FMCG / tobacco manufacturing (British American Tobacco group)",
    website: "https://www.ceylontobaccocompany.com/",
  },
  {
    name: "Creative Software",
    type: "Software services — development, QA, cloud & application management",
    website: "https://www.creativesoftware.com/",
  },
  {
    name: "DIMO",
    type: "Diversified engineering conglomerate — mobility, power engineering, agriculture, infrastructure",
    website: "https://www.dimolanka.com/",
  },
  {
    name: "Elevex",
    type: "Custom software development — web, mobile, cloud & AI/ML products",
    website: "https://www.elevex.global/",
  },
  {
    name: "GTN tech",
    type: "FinTech — global trading & investment platforms",
    website: "https://gtngroup.com/",
  },
  {
    name: "Hemas affiliated",
    type: "Diversified — consumer brands, healthcare & pharmaceuticals, mobility/logistics",
    website: "https://www.hemas.com/",
  },
  {
    name: "Hutch | Internet & Telecommunication Service Provider",
    type: "Telecommunications — mobile network & broadband operator",
    website: "https://hutch.lk/",
  },
  {
    name: "IPD",
    type: "Electrical engineering — power distribution, industrial control, solar PV, automation & HVAC",
    website: "https://ipd.lk/",
  },
  {
    name: "Idea8",
    type: "Product engineering — electronics & PCB design, embedded firmware, robotics & machine vision",
    website: "https://www.idea8.us/",
  },
  {
    name: "Inqube",
    type: "Apparel innovation & smart clothing (design and vertical manufacturing)",
    website: "https://www.inqube.com/",
  },
  {
    name: "Loons Lab",
    type: "Software & advanced tech — web, mobile, AR/VR, IoT and machine learning",
    website: "https://loonslab.com/",
  },
  {
    name: "MAGA Engineering",
    type: "Construction & civil infrastructure — buildings, roads, bridges, water supply",
    website: "https://www.maga.lk/",
  },
  {
    name: "MAS holdings",
    type: "Apparel & textile manufacturing — intimates, sportswear and performance wear",
    website: "https://masholdings.com/",
  },
  {
    name: "Pelwatte Dairy",
    type: "Food & beverage manufacturing — milk processing, dairy products and animal feed",
    website: "https://pelwattedairy.com/",
  },
  {
    name: "RMA Energy",
    type: "Energy consultancy — power generation, renewable energy and utility planning",
    website: "https://rmaenergy.lk/",
  },
  {
    name: "VarioSystems",
    type: "Electronics manufacturing services (EMS) — PCB assembly, testing & embedded engineering",
    website: "https://www.variosystems.com/",
  },
  {
    name: "ZeroBeta",
    type: "FinTech — risk management, market data and high-performance computing for capital markets",
    website: "https://zerobeta.xyz/",
  },
];

/** Shows "dimolanka.com" rather than the full URL, to keep the column narrow. */
function displayDomain(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

export default function CompanyGuide() {
  return (
    <section className="company-guide" aria-labelledby="company-guide-title">
      <div className="company-guide__heading">
        <h2 id="company-guide-title">Company reference guide</h2>
        <p>
          Industry and official website for each partner company, compiled from publicly available
          sources. Use it to research a company before ranking your preferences — every company
          considers applicants from all departments.
        </p>
      </div>

      <div className="company-guide__scroll">
        <table className="company-guide-table">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Industry / type</th>
              <th scope="col">Website</th>
            </tr>
          </thead>
          <tbody>
            {companyGuide.map((row) => (
              <tr key={row.name}>
                <td data-label="Company">
                  <span className="company-guide-name">{row.name}</span>
                </td>
                <td data-label="Industry / type">{row.type}</td>
                <td data-label="Website">
                  <a
                    className="company-guide-link"
                    href={row.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {displayDomain(row.website)}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
