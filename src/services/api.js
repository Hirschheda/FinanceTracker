import axios from "axios";

const API = axios.create({
  baseURL: "insert api url here",
});

export default API;