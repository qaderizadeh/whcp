const fs = require("fs");
const path = require("path");
const connect = require("connect");
const tls = require("tls");
const https = require("https");
const vhost = require("vhost");

const port = 3000;

// create main app
const app = connect();

// load domains
const domains = require(path.join(__dirname, "domains.json"));

var secureContext = {};

for (const { host, root, key, cert } of domains) {
  const hostReg = new RegExp("^(?:www.)?" + host + "$", "g");
  try {
    app.use(vhost(hostReg, require(root)));
    secureContext[host] = tls.createSecureContext({
      key: fs.readFileSync(key, "utf8"),
      cert: fs.readFileSync(cert, "utf8"),
    });
  } catch (err) {
    app.use(
      vhost(hostReg, (req, res) => {
        res.statusCode = 500;
        res.end("<pre>" + err.message + "</pre>");
      })
    );
  }
}

app.use(
  vhost(
    /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/g,
    function (req, res) {
      // handle req + res belonging to mail.example.com
      res.setHeader("Content-Type", "text/plain");
      res.end("hello from Others!");
    }
  )
);

// app.use(
//   vhost("*", function (req, res) {
//     // handle req + res belonging to mail.example.com
//     res.setHeader("Content-Type", "text/plain");
//     res.end("hello from Others!");
//   })
// );

const options = {
  SNICallback: function (domain, cb) {
    domain = domain.replace(/^www./, "");
    if (secureContext[domain]) {
      if (cb) {
        cb(null, secureContext[domain]);
      } else {
        // compatibility for older versions of node
        return secureContext[domain];
      }
    } else {
      if (cb) {
        cb(null, secureContext[domains[0]]);
      } else {
        // compatibility for older versions of node
        return secureContext[domains[0]];
      }
      // throw new Error("No keys/certificates for domain requested");
    }
  },
  // must list a default key and cert because required by tls.createServer()
  key: fs.readFileSync(path.join(__dirname, "privkey.pem")),
  cert: fs.readFileSync(path.join(__dirname, "fullchain.pem")),
};

https
  .createServer(options, app)
  .listen(port, () => console.log("listening..."));
