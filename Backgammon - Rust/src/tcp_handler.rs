use std::io::{BufRead, BufReader, BufWriter, Write};
use std::net::TcpStream;

use serde_json::Value;

const DEFAULT_BUF_SIZE: usize = 512;

/// Wraps a TcpStream and allows easy writing and reading of serde_json::Value
pub struct TcpHandler {
    reader: BufReader<TcpStream>,
    writer: BufWriter<TcpStream>,
    in_buffer: String,
}

impl Clone for TcpHandler {
    fn clone(&self) -> Self {
        let stream = self.reader.get_ref();
        TcpHandler::new(stream.try_clone().unwrap())
    }
}

impl TcpHandler {
    pub fn new(stream: TcpStream) -> TcpHandler {
        TcpHandler {
            reader: BufReader::with_capacity(DEFAULT_BUF_SIZE, stream.try_clone().unwrap()),
            writer: BufWriter::with_capacity(DEFAULT_BUF_SIZE, stream.try_clone().unwrap()),
            in_buffer: String::new(),
        }
    }

    pub fn read_line(&mut self) -> Value {
        //! read one line from socket
        let out_val = match self.reader.read_line(&mut self.in_buffer) {
            Ok(0) => Value::Null,
            Ok(_) => serde_json::from_str(&self.in_buffer).unwrap(),
            Err(e) => panic!("received error: {}", e),
        };
        self.in_buffer.clear();
        out_val
    }

    pub fn write(&mut self, val: &Value) {
        //! write json to socket
        let output_str = format!("{}\n", val);
        self.writer.write(output_str.as_bytes()).ok();
        self.writer.flush().ok();
    }
}