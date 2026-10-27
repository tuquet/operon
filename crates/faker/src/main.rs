use clap::{Parser, ValueEnum};
use faker::{generate_users, to_csv, to_json};
use std::fs;
use std::path::PathBuf;

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum, Debug)]
pub enum OutputFormat {
    Table,
    Json,
    Csv,
}

#[derive(Parser, Debug)]
#[command(
    name = "faker",
    author = "Team <dev@operon.io>",
    version = env!("CARGO_PKG_VERSION"),
    about = "Synthetic Persona & Identity Generator with validated national ID and geographic structures"
)]
pub struct Cli {
    /// Number of profiles to generate
    #[arg(short = 'n', long, default_value = "1")]
    pub count: u32,

    /// Gender filter: male, female, or all
    #[arg(short = 'g', long, default_value = "all")]
    pub gender: String,

    /// Nationality filter: VN, US, or all
    #[arg(long, default_value = "VN")]
    pub nat: String,

    /// Avatar style: real (portrait photo) or svg (vector avatar)
    #[arg(long, default_value = "real")]
    pub avatar: String,

    /// Output format: table, json, or csv
    #[arg(short = 'f', long, value_enum, default_value_t = OutputFormat::Table)]
    pub format: OutputFormat,

    /// Custom email domain (e.g. flowup.io.vn), overrides faker.json config
    #[arg(short = 'd', long)]
    pub domain: Option<String>,

    /// Optional file path to save output to
    #[arg(short = 'o', long)]
    pub output: Option<PathBuf>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    let gender_opt = if cli.gender == "all" {
        None
    } else {
        Some(cli.gender.as_str())
    };
    let nat_opt = if cli.nat == "all" {
        None
    } else {
        Some(cli.nat.as_str())
    };
    let avatar_opt = Some(cli.avatar.as_str());

    let data = generate_users(
        cli.count,
        gender_opt,
        nat_opt,
        avatar_opt,
        cli.domain.as_deref(),
    );
    let users = data["results"].as_array().expect("results is array");

    let output_str = match cli.format {
        OutputFormat::Json => to_json(users, true)?,
        OutputFormat::Csv => to_csv(users),
        OutputFormat::Table => {
            let mut out = String::new();
            out.push_str(&format!(
                "{:<4} {:<24} {:<8} {:<4} {:<14} {:<28} {:<18} {:<16}\n",
                "STT", "Họ và tên", "Giới", "Tuổi", "CCCD", "Email", "Số ĐT", "Tỉnh / TP"
            ));
            out.push_str(&"-".repeat(122));
            out.push('\n');

            for (i, u) in users.iter().enumerate() {
                let first = u["name"]["first"].as_str().unwrap_or("");
                let last = u["name"]["last"].as_str().unwrap_or("");
                let full_name = format!("{} {}", first, last);
                let gender = u["gender"].as_str().unwrap_or("");
                let age = u["dob"]["age"].to_string();
                let cccd = u["id"]["value"].as_str().unwrap_or("");
                let email = u["email"].as_str().unwrap_or("");
                let phone = u["phone"].as_str().unwrap_or("");
                let city = u["location"]["city"].as_str().unwrap_or("");

                out.push_str(&format!(
                    "{:<4} {:<24} {:<8} {:<4} {:<14} {:<28} {:<18} {:<16}\n",
                    i + 1,
                    full_name,
                    gender,
                    age,
                    cccd,
                    email,
                    phone,
                    city
                ));
            }
            out
        }
    };

    if let Some(ref path) = cli.output {
        fs::write(path, output_str.as_bytes())?;
        println!("Exported {} profile(s) to {:?}", users.len(), path);
    } else {
        println!("{}", output_str);
    }

    Ok(())
}
