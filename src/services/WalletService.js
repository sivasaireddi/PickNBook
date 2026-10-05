import { client } from "./cashfreeService";

const unwrap = (payload) => payload?.data ?? payload?.result ?? payload;

const value = (object, ...keys) => {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null) return object[key];
  }
  return undefined;
};

const apiError = (error, fallback) => {
  const message = error?.response?.data?.message || error?.response?.data?.Message;
  const normalized = new Error(message || fallback);
  normalized.status = error?.response?.status;
  throw normalized;
};

export async function getWalletSummary() {
  try {
    const data = unwrap((await client.get("/api/wallet/summary")).data) || {};
    return {
      availableBalance: Number(value(data, "availableBalance", "AvailableBalance") || 0),
      picknbookCoins: Number(value(data, "picknbookCoins", "PicknbookCoins", "pickNBookCoins") || 0),
      walletStatus: String(value(data, "walletStatus", "WalletStatus") || ""),
      totalAdded: Number(value(data, "totalAdded", "TotalAdded") || 0),
      totalRefunded: Number(value(data, "totalRefunded", "TotalRefunded") || 0),
      totalUsed: Number(value(data, "totalUsed", "TotalUsed") || 0),
    };
  } catch (error) {
    apiError(error, "Unable to load wallet information. Please try again.");
  }
}

export async function getWalletDeposits() {
  try {
    const data = unwrap((await client.get("/api/wallet/deposits")).data);
    const items = Array.isArray(data) ? data : data?.items || data?.deposits || [];
    return items.map((item) => ({
      id: value(item, "id", "Id"),
      amount: Number(value(item, "amount", "Amount") || 0),
      type: String(value(item, "type", "Type") || ""),
      status: String(value(item, "status", "Status") || "Pending"),
      userRemark: String(value(item, "userRemark", "UserRemark") || ""),
      adminRemark: value(item, "adminRemark", "AdminRemark") || "",
      entryDate: value(item, "entryDate", "EntryDate"),
      transactionDate: value(item, "transactionDate", "TransactionDate"),
    }));
  } catch (error) {
    apiError(error, "Unable to load wallet information. Please try again.");
  }
}

export async function getWalletTransactions(page = 1, pageSize = 20, type) {
  try {
    const response = await client.get("/api/wallet/transactions", {
      params: { page, pageSize, ...(type && type !== "All" ? { type } : {}) },
    });
    const data = unwrap(response.data) || {};
    const items = Array.isArray(data) ? data : data.items || data.transactions || [];
    return {
      totalCount: Number(value(data, "totalCount", "TotalCount") || items.length),
      page: Number(value(data, "page", "Page") || page),
      pageSize: Number(value(data, "pageSize", "PageSize") || pageSize),
      totalPages: Number(value(data, "totalPages", "TotalPages") || 1),
      items: items.map((item) => ({
        id: value(item, "id", "Id"),
        transactionType: String(value(item, "transactionType", "TransactionType") || ""),
        amount: Number(value(item, "amount", "Amount") || 0),
        runningBalance: Number(value(item, "runningBalance", "RunningBalance") || 0),
        referenceType: String(value(item, "referenceType", "ReferenceType") || ""),
        refCode: String(value(item, "refCode", "RefCode") || ""),
        description: String(value(item, "description", "Description") || ""),
        status: String(value(item, "status", "Status") || ""),
        createdAt: value(item, "createdAt", "CreatedAt"),
      })),
    };
  } catch (error) {
    apiError(error, "Unable to load wallet information. Please try again.");
  }
}

export default {
  getWalletSummary,
  getWalletDeposits,
  getWalletTransactions,
};
