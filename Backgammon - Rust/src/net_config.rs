use std::net::{TcpStream, TcpListener};

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize)]
#[cfg_attr(debug_assertions, derive(Debug))]
#[serde(deny_unknown_fields)]
pub struct NetConfig {
    host: Value,
    port: Value,
}

impl NetConfig {
    pub fn new(hst: Value, prt: Value) -> NetConfig {
        NetConfig {
            host: hst,
            port: prt,
        }
    }

    pub fn connect(&self) -> Result<TcpStream, std::io::Error> {
        let mut address: String = self.host.as_str().unwrap().to_string();
        address.push(':');
        address.push_str(&self.port.as_u64().unwrap().to_string());
        TcpStream::connect(address)
    }

    pub fn connect_listener(port: Value) -> Result<TcpListener, std::io::Error>{
        let mut address: String = String::from("localhost:");
        address.push_str(&port.as_u64().unwrap().to_string());
        TcpListener::bind(address)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    #[should_panic]
    fn reject_bad_form() {
        let nc = NetConfig::new(json!([1, 2]), json!("hi"));
        let tmp = nc.connect().is_err();
        assert!(tmp);
    }
}