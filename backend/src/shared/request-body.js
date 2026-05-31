function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) {
        const error = new Error("请求体过大");
        error.statusCode = 413;
        req.destroy();
        reject(error);
      }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        const error = new Error("JSON 格式错误");
        error.statusCode = 400;
        reject(error);
      }
    });
  });
}

module.exports = { parseBody };
