const GENERIC_OUTCOME =
  /^(featured(\s+\w+)*\s+(storefront|website|project)|.+?\s+(product site|portfolio)|magento\s*\/\s*hyv[aä]\s+storefront|featured ecommerce project)$/i;

export function stripSourceCopy(text: string) {
  if (!text) return "";
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^(Live site|Source)\s*:/i.test(line) &&
        !/^Pulled from /i.test(line),
    )
    .join("\n\n")
    .replace(
      /\s+from\s+.+?(gallery|portfolio|list|examples|case studies|websites)\.?$/i,
      "",
    )
    .replace(/\s+\([^)]*(?:createtoday|framer\.com|younify|dotcomweavers|commercegurus|nelio|ppwd)[^)]*\)/gi, "")
    .trim();
}

export function displayOutcome(text: string) {
  const outcome = stripSourceCopy(text);
  if (!outcome) return "";
  if (GENERIC_OUTCOME.test(outcome.replace(/\.$/, ""))) return "";
  return outcome;
}