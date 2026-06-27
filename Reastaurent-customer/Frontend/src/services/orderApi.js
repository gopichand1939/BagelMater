import {
  CUSTOMER_MY_ORDERS,
  CUSTOMER_ORDER_DETAILS,
  CUSTOMER_PLACE_ORDER,
  CUSTOMER_PLACE_SCHEDULED_ORDER,
} from "../Utils/Constant";

const parseJsonResponse = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const authorizedPost = async (url, payload, accessToken) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload || {}),
  });

  const result = await parseJsonResponse(response);

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Request failed");
  }

  return result;
};

export const placeCustomerOrder = async (payload, accessToken) => {
  const result = await authorizedPost(CUSTOMER_PLACE_ORDER, payload, accessToken);
  return result.data;
};

export const placeCustomerScheduledOrder = async (payload, accessToken) => {
  const result = await authorizedPost(CUSTOMER_PLACE_SCHEDULED_ORDER, payload, accessToken);
  return result.data;
};

export const fetchMyOrders = async (
  accessToken,
  payload = {
    page: 1,
    limit: 20,
  }
) => {
  const result = await authorizedPost(CUSTOMER_MY_ORDERS, payload, accessToken);
  return result;
};

export const fetchCustomerOrderDetails = async (id, accessToken) => {
  const result = await authorizedPost(
    CUSTOMER_ORDER_DETAILS,
    { id },
    accessToken
  );
  return result.data;
};
