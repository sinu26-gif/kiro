/* ============================================================
 * sectors.js — sector-specific KPI templates for NEPSE
 * Add or edit a sector here; every page picks it up automatically.
 * ============================================================ */

const Sectors = (function () {
  const definitions = {
    hydropower: {
      label: "Hydropower",
      subIndex: "Hydropower Index",
      kpis: [
        { key: "installedMW", label: "Installed Capacity (MW)", unit: "MW", weight: 1.0 },
        { key: "plf", label: "Plant Load Factor", unit: "%", weight: 1.2 },
        { key: "ppaTariff", label: "PPA Tariff (NPR/kWh, dry)", unit: "NPR/kWh", weight: 1.0 },
        { key: "drySeasonShare", label: "Dry-Season Generation Share", unit: "%", weight: 0.8 },
        { key: "annualGenGWh", label: "Annual Generation", unit: "GWh", weight: 1.0 },
        { key: "codStatus", label: "COD Status", unit: "text", weight: 0.5 },
        { key: "debtEquity", label: "Debt / Equity", unit: "x", weight: 1.0, lowerBetter: true },
        { key: "interestCov", label: "Interest Coverage", unit: "x", weight: 1.0 },
      ],
      budgetLevers: [
        "VAT / customs on hydro equipment",
        "Royalty rate revisions",
        "Hydropower export incentives",
        "PPA tariff escalation review",
        "Renewable Energy Fund allocation",
        "Transmission corridor capex",
      ],
      defaultMacroSensitivity: { rates: -0.6, fx: -0.2, monsoon: 0.7 },
    },

    "commercial-banks": {
      label: "Commercial Banks",
      subIndex: "Banking Sub-Index",
      kpis: [
        { key: "carPercent", label: "Capital Adequacy Ratio (CAR)", unit: "%", weight: 1.2 },
        { key: "nplPercent", label: "Non-Performing Loans (NPL)", unit: "%", weight: 1.5, lowerBetter: true },
        { key: "cdRatio", label: "Credit-Deposit Ratio", unit: "%", weight: 1.0 },
        { key: "nim", label: "Net Interest Margin", unit: "%", weight: 1.2 },
        { key: "costIncome", label: "Cost-to-Income", unit: "%", weight: 1.0, lowerBetter: true },
        { key: "casaShare", label: "CASA Deposit Share", unit: "%", weight: 1.0 },
        { key: "provCoverage", label: "Provision Coverage", unit: "%", weight: 0.9 },
      ],
      budgetLevers: [
        "Tax on retained earnings / dividend tax",
        "Priority sector lending mandate",
        "Deposit insurance threshold",
        "NRB capital adequacy directives",
        "Refinance facility caps",
      ],
      defaultMacroSensitivity: { rates: 0.4, liquidity: 0.8, gdp: 0.5 },
    },

    "development-banks": {
      label: "Development Banks",
      subIndex: "Development Bank Sub-Index",
      kpis: [
        { key: "carPercent", label: "Capital Adequacy", unit: "%", weight: 1.2 },
        { key: "nplPercent", label: "NPL", unit: "%", weight: 1.5, lowerBetter: true },
        { key: "cdRatio", label: "CD Ratio", unit: "%", weight: 1.0 },
        { key: "nim", label: "NIM", unit: "%", weight: 1.2 },
        { key: "branches", label: "Branch Count", unit: "#", weight: 0.6 },
      ],
      budgetLevers: ["Merger incentives", "Provincial deposit mandate", "Tax holidays"],
      defaultMacroSensitivity: { rates: 0.4, gdp: 0.6 },
    },

    microfinance: {
      label: "Microfinance",
      subIndex: "Microfinance Sub-Index",
      kpis: [
        { key: "loanGrowth", label: "Loan Growth YoY", unit: "%", weight: 1.0 },
        { key: "borrowerCount", label: "Active Borrowers", unit: "#", weight: 0.7 },
        { key: "nplPercent", label: "NPL", unit: "%", weight: 1.5, lowerBetter: true },
        { key: "yieldOnLoan", label: "Yield on Loans", unit: "%", weight: 1.0 },
        { key: "operatingMargin", label: "Operating Margin", unit: "%", weight: 1.0 },
      ],
      budgetLevers: [
        "Interest rate cap revisions",
        "Subsidized refinance line",
        "Rural credit subsidy",
        "Single-obligor cap",
      ],
      defaultMacroSensitivity: { rates: 0.7, ruralIncome: 0.9 },
    },

    "life-insurance": {
      label: "Life Insurance",
      subIndex: "Life Insurance Sub-Index",
      kpis: [
        { key: "solvencyMargin", label: "Solvency Margin", unit: "x", weight: 1.3 },
        { key: "premiumGrowth", label: "Net Premium Growth", unit: "%", weight: 1.0 },
        { key: "investYield", label: "Investment Yield", unit: "%", weight: 1.0 },
        { key: "lapseRatio", label: "Policy Lapse Ratio", unit: "%", weight: 1.0, lowerBetter: true },
        { key: "claimRatio", label: "Claim Ratio", unit: "%", weight: 1.0, lowerBetter: true },
      ],
      budgetLevers: [
        "Premium tax treatment",
        "Mandatory life insurance cover schemes",
        "Foreign reinsurance rules",
      ],
      defaultMacroSensitivity: { rates: 0.5, gdp: 0.6 },
    },

    "non-life-insurance": {
      label: "Non-Life Insurance",
      subIndex: "Non-Life Insurance Sub-Index",
      kpis: [
        { key: "combinedRatio", label: "Combined Ratio", unit: "%", weight: 1.4, lowerBetter: true },
        { key: "lossRatio", label: "Loss Ratio", unit: "%", weight: 1.2, lowerBetter: true },
        { key: "premiumGrowth", label: "Premium Growth", unit: "%", weight: 1.0 },
        { key: "investYield", label: "Investment Yield", unit: "%", weight: 1.0 },
      ],
      budgetLevers: ["Vehicle insurance mandates", "Crop insurance subsidy", "Reinsurance rules"],
      defaultMacroSensitivity: { gdp: 0.7, vehicleSales: 0.6 },
    },

    hotels: {
      label: "Hotels & Tourism",
      subIndex: "Hotel & Tourism Sub-Index",
      kpis: [
        { key: "occupancy", label: "Occupancy Rate", unit: "%", weight: 1.3 },
        { key: "arr", label: "Average Room Rate", unit: "NPR", weight: 1.0 },
        { key: "revpar", label: "RevPAR", unit: "NPR", weight: 1.2 },
        { key: "grossMargin", label: "Gross Margin", unit: "%", weight: 1.0 },
      ],
      budgetLevers: ["Tourism promotion budget", "Visa-on-arrival tweaks", "Air-connectivity grants"],
      defaultMacroSensitivity: { tourism: 1.0, fx: 0.4 },
    },

    manufacturing: {
      label: "Manufacturing & Processing",
      subIndex: "Manufacturing Sub-Index",
      kpis: [
        { key: "capacityUtil", label: "Capacity Utilization", unit: "%", weight: 1.2 },
        { key: "grossMargin", label: "Gross Margin", unit: "%", weight: 1.1 },
        { key: "wcDays", label: "Working Capital (days)", unit: "days", weight: 0.9, lowerBetter: true },
        { key: "exportShare", label: "Export Share of Sales", unit: "%", weight: 0.8 },
      ],
      budgetLevers: ["Customs / VAT on raw material", "Export rebate", "Industrial tax holidays"],
      defaultMacroSensitivity: { gdp: 0.7, fx: 0.5, energy: -0.4 },
    },

    investment: {
      label: "Investment / Holding",
      subIndex: "Investment Sub-Index",
      kpis: [
        { key: "navPerShare", label: "NAV per Share", unit: "NPR", weight: 1.2 },
        { key: "discountToNav", label: "Discount / Premium to NAV", unit: "%", weight: 1.0 },
        { key: "portfolioYield", label: "Portfolio Yield", unit: "%", weight: 1.0 },
      ],
      budgetLevers: ["CGT on equity", "Mutual fund tax", "Dividend tax"],
      defaultMacroSensitivity: { marketBeta: 1.0 },
    },

    others: {
      label: "Others / Generic",
      subIndex: "Others Sub-Index",
      kpis: [
        { key: "revenueGrowth", label: "Revenue Growth", unit: "%", weight: 1.0 },
        { key: "ebitMargin", label: "EBIT Margin", unit: "%", weight: 1.1 },
        { key: "roe", label: "ROE", unit: "%", weight: 1.2 },
      ],
      budgetLevers: ["Sector-specific tax", "Subsidies", "Regulatory reforms"],
      defaultMacroSensitivity: { gdp: 0.6 },
    },
  };

  function list() {
    return Object.entries(definitions).map(([key, v]) => ({ key, label: v.label }));
  }
  function get(key) {
    return definitions[key] || definitions.others;
  }
  function commonRatios() {
    return [
      { key: "eps", label: "EPS", unit: "NPR" },
      { key: "bvps", label: "Book Value / Share", unit: "NPR" },
      { key: "pe", label: "P / E", unit: "x" },
      { key: "pb", label: "P / B", unit: "x" },
      { key: "roe", label: "ROE", unit: "%" },
      { key: "roa", label: "ROA", unit: "%" },
      { key: "dividendYield", label: "Dividend Yield", unit: "%" },
      { key: "paidUpCapital", label: "Paid-up Capital", unit: "NPR Cr" },
      { key: "netProfit3yCagr", label: "Net Profit 3y CAGR", unit: "%" },
    ];
  }

  return { list, get, commonRatios, definitions };
})();
