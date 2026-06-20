import {
  CUSTOMER_CHANGE_PASSWORD,
  CUSTOMER_LOGIN,
  CUSTOMER_LOGOUT,
  CUSTOMER_REFRESH_TOKEN,
  CUSTOMER_REGISTER,
} from "../Utils/Constant";

const parseJsonResponse = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const postJson = async (url, payload, options = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.token
        ? {
            Authorization: `Bearer ${options.token}`,
          }
        : {}),
    },
    body: JSON.stringify(payload || {}),
  });

  const result = await parseJsonResponse(response);

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Request failed");
  }

  return result;
};

export const registerCustomer = async (payload) => {
  const result = await postJson(CUSTOMER_REGISTER, payload);
  return result.data;
};

export const loginCustomer = async (payload) => {
  const result = await postJson(CUSTOMER_LOGIN, payload);
  return result.data;
};

export const refreshCustomerToken = async (refreshToken) => {
  const result = await postJson(CUSTOMER_REFRESH_TOKEN, {
    refresh_token: refreshToken,
  });
  return result.data;
};

export const logoutCustomer = async (accessToken) => {
  const result = await postJson(CUSTOMER_LOGOUT, {}, { token: accessToken });
  return result;
};

export const changeCustomerPassword = async (payload, accessToken) => {
  const result = await postJson(CUSTOMER_CHANGE_PASSWORD, payload, {
    token: accessToken,
  });
  return result;
};
