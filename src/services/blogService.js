import { API_BASE_URL } from "../constants/config";

const PUBLIC_SITE_URL = "https://www.picknbook.in";

function buildApiUrl(path) {
  return `${String(API_BASE_URL || "").replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
}

export function getBlogImageUrl(blog) {
  const raw = blog?.imageUrl || blog?.ImageUrl || blog?.image || blog?.Image || blog?.thumbnail || blog?.coverImage || "";
  if (!raw || raw === "-" || raw === "null" || raw === "undefined") return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return buildApiUrl(raw);
}

export function getPublicBlogUrl(slug) {
  const safeSlug = String(slug || "").trim();
  return safeSlug ? `${PUBLIC_SITE_URL}/blog/${encodeURIComponent(safeSlug)}` : "";
}

export function getPublicBlogListingUrl() {
  return `${PUBLIC_SITE_URL}/blog`;
}

export async function getPublicBlogs({ page = 1, pageSize = 3, category = "Bus Booking" } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (category) params.set("category", category);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(buildApiUrl(`/api/Blogs?${params.toString()}`), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Blog request failed with status ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload?.blogs) ? payload.blogs : [];
  } finally {
    clearTimeout(timeout);
  }
}
