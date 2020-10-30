extern crate rmp_serde as rmps;
use rmps::{Deserializer, Serializer};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

extern crate log;
extern crate wapc_guest as guest;
use guest::prelude::*;

use lazy_static::lazy_static;
use std::sync::RwLock;

pub struct Host {
    binding: String,
}

impl Default for Host {
    fn default() -> Self {
        Host {
            binding: "default".to_string(),
        }
    }
}

/// Creates a named host binding
pub fn host(binding: &str) -> Host {
    Host {
        binding: binding.to_string(),
    }
}

/// Creates the default host binding
pub fn default() -> Host {
    Host::default()
}

impl Host {
    pub fn update(&self, width: u32, height: u32, limit: u32) -> HandlerResult<Vec<u16>> {
        let input_args = UpdateArgs {
            width: width,
            height: height,
            limit: limit,
        };
        host_call(
            &self.binding,
            "mandelbrot",
            "update",
            &serialize(input_args)?,
        )
        .map(|vec| {
            let resp = deserialize::<Vec<u16>>(vec.as_ref()).unwrap();
            resp
        })
        .map_err(|e| e.into())
    }
}

pub struct Handlers {}

impl Handlers {
    pub fn register_update(f: fn(u32, u32, u32) -> HandlerResult<Vec<u16>>) {
        *UPDATE.write().unwrap() = Some(f);
        register_function(&"update", update_wrapper);
    }
}

lazy_static! {
    static ref UPDATE: RwLock<Option<fn(u32, u32, u32) -> HandlerResult<Vec<u16>>>> =
        RwLock::new(None);
}

fn update_wrapper(input_payload: &[u8]) -> CallResult {
    let input = deserialize::<UpdateArgs>(input_payload)?;
    let lock = UPDATE.read().unwrap().unwrap();
    let result = lock(input.width, input.height, input.limit)?;
    Ok(serialize(result)?)
}

#[derive(Debug, PartialEq, Deserialize, Serialize, Default, Clone)]
pub struct UpdateArgs {
    #[serde(rename = "width")]
    pub width: u32,
    #[serde(rename = "height")]
    pub height: u32,
    #[serde(rename = "limit")]
    pub limit: u32,
}

/// The standard function for serializing codec structs into a format that can be
/// used for message exchange between actor and host. Use of any other function to
/// serialize could result in breaking incompatibilities.
pub fn serialize<T>(
    item: T,
) -> ::std::result::Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>>
where
    T: Serialize,
{
    let mut buf = Vec::new();
    item.serialize(&mut Serializer::new(&mut buf).with_struct_map())?;
    Ok(buf)
}

/// The standard function for de-serializing codec structs from a format suitable
/// for message exchange between actor and host. Use of any other function to
/// deserialize could result in breaking incompatibilities.
pub fn deserialize<'de, T: Deserialize<'de>>(
    buf: &[u8],
) -> ::std::result::Result<T, Box<dyn std::error::Error + Send + Sync>> {
    let mut de = Deserializer::new(Cursor::new(buf));
    match Deserialize::deserialize(&mut de) {
        Ok(t) => Ok(t),
        Err(e) => Err(format!("Failed to de-serialize: {}", e).into()),
    }
}
