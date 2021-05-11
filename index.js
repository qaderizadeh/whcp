const fs = require("fs");
const path = require("path");
const connect = require("connect");
const tls = require("tls");
const https = require("https");
const vhost = require("vhost");

const port = 3443;

// create main app
const app = connect();

// load domains
const domains = require(path.join(__dirname, "domains.json"));

var secureContext = {};

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

global.server = https.createServer(options, app);

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
      res.setHeader("Content-Type", "text/html");
      res.statusCode = 404;
      res.end(
        "<!DOCTYPE html>" +
          "<html lang=en>" +
          "<meta charset=utf-8>" +
          '<meta name=viewport content="initial-scale=1, minimum-scale=1, width=device-width">' +
          "<title>Error 404 (Not Found)</title>" +
          "<style>" +
          "*{margin:0;padding:0}html,code{font:15px/22px arial,sans-serif}html{background:#fff;color:#222;padding:15px}body{margin:7% auto 0;max-width:390px;min-height:180px;padding:30px 0 15px}* > body{background:url(//www.google.com/images/errors/robot.png) 100% 5px no-repeat;padding-right:205px}p{margin:11px 0 22px;overflow:hidden}ins{color:#777;text-decoration:none}a img{border:0}@media screen and (max-width:772px){body{background:none;margin-top:0;max-width:none;padding-right:0}}#logo{background:url(//www.parsecard.com/frontend/web/images/main-logo.png) no-repeat;margin-left:-5px}@media only screen and (min-resolution:192dpi){#logo{background:url(//www.parsecard.com/frontend/web/images/main-logo.png) no-repeat 0% 0%/100% 100%;-moz-border-image:url(//www.parsecard.com/frontend/web/images/main-logo.png) 0}}@media only screen and (-webkit-min-device-pixel-ratio:2){#logo{background:url(//www.parsecard.com/frontend/web/images/main-logo.png) no-repeat;-webkit-background-size:100% 100%}}#logo{display:inline-block;height:54px;width:150px}" +
          "</style>" +
          '<a href="//www.parsecard.com/"><img src="//www.parsecard.com/frontend/web/images/main-logo.png"></a>' +
          "<p><b>404.</b> <ins>That’s an error.</ins>" +
          "<p>The requested URL <code>" +
          req.url +
          "</code> was not found on this server.  <ins>That’s all we know.</ins>"
      );
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

server.listen(port, () => console.log("listening on port 3443 ..."));
