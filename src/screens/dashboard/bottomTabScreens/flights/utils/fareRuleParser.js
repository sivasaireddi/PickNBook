/**
 * Utility to parse raw HTML / String response from SRDV FareRule API
 * into structured JSON sections for modern React Native UI rendering.
 */

export function parseRawFareRules(resData) {
  if (!resData) return { specialRules: [], sections: [] };

  const resObj = resData?.Response || resData?.Results || resData;
  const rawSpecialRuleHtml = resData?.SpecialRule || resObj?.SpecialRule || "";

  // 1. Extract Special Rules
  const specialRules = [];
  if (rawSpecialRuleHtml) {
    const cleanText = stripHtmlTags(rawSpecialRuleHtml);
    if (cleanText) specialRules.push(cleanText);
  }

  // 2. Locate FareRuleDetail string or array
  let resultsList = resData?.Results || resObj?.Results || resObj?.FareRules || resObj?.FareRule || [];
  if (!Array.isArray(resultsList)) resultsList = [resultsList].filter(Boolean);

  const sections = [];

  resultsList.forEach((item) => {
    const htmlContent = typeof item === "string" ? item : (item.FareRuleDetail || item.FareRestriction || item.SpecialRule || "");
    const parsedSections = parseHtmlSections(htmlContent, item.Origin, item.Destination, item.Airline);
    sections.push(...parsedSections);
  });

  return {
    specialRules,
    sections,
  };
}

function stripHtmlTags(str) {
  if (!str) return "";
  return String(str)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/__be__/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseHtmlSections(htmlStr, origin, destination, airline) {
  if (!htmlStr) return [];
  const text = String(htmlStr);

  // Split content by <h4> tag headers
  const h4Split = text.split(/<h4[^>]*>/i);
  const parsedSections = [];

  h4Split.forEach((block, idx) => {
    if (idx === 0 && !block.includes("<table")) {
      // Preamble or header text before first h4
      const preambleText = stripHtmlTags(block);
      if (preambleText && preambleText.length > 5) {
        parsedSections.push({
          title: "General Policy",
          icon: "information-circle-outline",
          color: "#4B5563",
          origin,
          destination,
          airline,
          rows: [],
          notes: [preambleText],
        });
      }
      return;
    }

    const titleEndIdx = block.indexOf("</h4>");
    let rawTitle = "Fare Policy";
    let bodyText = block;

    if (titleEndIdx !== -1) {
      rawTitle = stripHtmlTags(block.substring(0, titleEndIdx));
      bodyText = block.substring(titleEndIdx + 5);
    }

    // Determine section styling & icon
    const styleMeta = getSectionStyleMeta(rawTitle);

    // Extract table rows (Time Frame & Fees)
    const rows = [];
    const notes = [];

    // Match <tr> elements inside bodyText
    const trMatches = bodyText.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    trMatches.forEach((trHtml) => {
      // Extract <td> contents
      const tdMatches = trHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (tdMatches.length >= 2) {
        const col1Raw = tdMatches[0];
        const col2Raw = tdMatches[1];

        // Skip table header rows
        if (col1Raw.toLowerCase().includes("time frame") || col1Raw.toLowerCase().includes("<th")) {
          return;
        }

        const col1Text = stripHtmlTags(col1Raw);

        // Separate fee text and bullet notes from col2
        const col2Html = col2Raw;
        const bulletLines = [];

        // Extract bullets (<br> * ...)
        const brParts = col2Html.split(/<br\s*[\/]?>|\n/gi);
        let feeMain = "";

        brParts.forEach((part) => {
          const cleanPart = stripHtmlTags(part);
          if (!cleanPart) return;
          if (cleanPart.startsWith("*") || cleanPart.toLowerCase().includes("permitted") || cleanPart.toLowerCase().includes("rs ")) {
            bulletLines.push(cleanPart.replace(/^\*\s*/, "• "));
          } else if (!feeMain) {
            feeMain = cleanPart;
          } else {
            bulletLines.push(cleanPart);
          }
        });

        if (col1Text || feeMain) {
          rows.push({
            timeframe: col1Text || "All Timeframes",
            fee: feeMain || "As Applicable",
          });
        }

        if (bulletLines.length > 0) {
          notes.push(...bulletLines);
        }
      }
    });

    // Fallback if no table rows were matched but text exists
    if (rows.length === 0 && notes.length === 0) {
      const fallbackText = stripHtmlTags(bodyText);
      if (fallbackText) {
        notes.push(fallbackText);
      }
    }

    parsedSections.push({
      title: rawTitle,
      icon: styleMeta.icon,
      color: styleMeta.color,
      badgeBg: styleMeta.badgeBg,
      origin,
      destination,
      airline,
      rows,
      notes,
    });
  });

  return parsedSections;
}

function getSectionStyleMeta(titleStr) {
  const title = String(titleStr || "").toLowerCase();

  if (title.includes("cancellation") || title.includes("cancel")) {
    return { icon: "close-circle-outline", color: "#DC2626", badgeBg: "#FEF2F2" };
  }
  if (title.includes("date change") || title.includes("reschedule") || title.includes("change")) {
    return { icon: "calendar-outline", color: "#2563EB", badgeBg: "#EFF6FF" };
  }
  if (title.includes("no show") || title.includes("noshow")) {
    return { icon: "alert-circle-outline", color: "#D97706", badgeBg: "#FEFCE8" };
  }
  if (title.includes("seat")) {
    return { icon: "easel-outline", color: "#7C3AED", badgeBg: "#F5F3FF" };
  }

  return { icon: "document-text-outline", color: "#059669", badgeBg: "#ECFDF5" };
}
