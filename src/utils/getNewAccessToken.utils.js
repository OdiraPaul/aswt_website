const axios = require("axios");
require("dotenv").config();
const { AccessToken } = require("../model/accessToken.model");
const { RefreshToken } = require("../model/refreshToken.model");
const { getOrSetCache, updateCache } = require("./getOrSetCache.utils");
const tokenServices = require("../services/token.services");
const { env } = process;

const clientId = env.clientId;
const clientSecret = env.clientSecret;

const tokenEndpoint = env.tokenEndpoint;

// Function to refresh the access token
class OauthTokenController {
  async getNewAccessToken() {
    const expires = 1800;
    const { getLatestToken } = tokenServices;
    const basicAuth = Buffer.from(clientId + ":" + clientSecret).toString(
      "base64"
    );

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basicAuth}`,
    };

    try {
      let { data: accessToken, error: accessError } = await getOrSetCache(
        "accessToken",
        expires,
        getLatestToken,
        [AccessToken]
      );
      if (accessToken) {
        const now = new Date();
        const accessTokenExpiryTime = new Date(accessToken.expires);
        const isAccessTokenValid = now < accessTokenExpiryTime;

        if (isAccessTokenValid) return accessToken.token;
      }

      let { data: refreshToken, error: refreshError } = await getOrSetCache(
        "refreshToken",
        expires,
        getLatestToken,
        [RefreshToken]
      );

      const data = `grant_type=refresh_token&refresh_token=${refreshToken.token}`;
      const { data: responseData } = await axios.post(tokenEndpoint, data, {
        headers,
      });
      const newAccessToken = await tokenServices.updateAccessAndRefreshToken(
        responseData
      );

      accessToken = newAccessToken;

      return accessToken;
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = new OauthTokenController();
