use serde::{Deserialize, Serialize};

/// Thông tin địa lý, múi giờ và ngôn ngữ ánh xạ từ mã quốc gia ISO 3166-1 alpha-2
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GeoIpMetadata {
    pub country_code: String,
    pub timezone: String,
    pub default_lang: String,
    pub accept_lang: String,
}

pub struct GeoIpResolver;

impl GeoIpResolver {
    /// Tra cứu thông tin múi giờ và ngôn ngữ chuẩn xác từ mã quốc gia (2 ký tự viết hoa)
    pub fn resolve_country(country_code: &str) -> Option<GeoIpMetadata> {
        let code = country_code.trim().to_uppercase();
        let (tz, lang, accept) = match code.as_str() {
            "VN" => ("Asia/Ho_Chi_Minh", "vi-VN", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"),
            "US" => ("America/New_York", "en-US", "en-US,en;q=0.9"),
            "JP" => ("Asia/Tokyo", "ja-JP", "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7"),
            "SG" => ("Asia/Singapore", "en-SG", "en-SG,en;q=0.9,zh-CN;q=0.8,zh;q=0.7"),
            "GB" | "UK" => ("Europe/London", "en-GB", "en-GB,en;q=0.9,en-US;q=0.8"),
            "DE" => ("Europe/Berlin", "de-DE", "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7"),
            "FR" => ("Europe/Paris", "fr-FR", "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"),
            "KR" => ("Asia/Seoul", "ko-KR", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"),
            "TH" => ("Asia/Bangkok", "th-TH", "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7"),
            "ID" => ("Asia/Jakarta", "id-ID", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"),
            "PH" => ("Asia/Manila", "en-PH", "en-PH,en;q=0.9,tl;q=0.8"),
            "MY" => ("Asia/Kuala_Lumpur", "ms-MY", "ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7"),
            "IN" => ("Asia/Kolkata", "en-IN", "en-IN,en;q=0.9,hi;q=0.8"),
            "AU" => ("Australia/Sydney", "en-AU", "en-AU,en;q=0.9,en-US;q=0.8"),
            "CA" => ("America/Toronto", "en-CA", "en-CA,en;q=0.9,fr-CA;q=0.8,en-US;q=0.7"),
            "BR" => ("America/Sao_Paulo", "pt-BR", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"),
            "RU" => ("Europe/Moscow", "ru-RU", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"),
            "NL" => ("Europe/Amsterdam", "nl-NL", "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7"),
            "TW" => ("Asia/Taipei", "zh-TW", "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7"),
            "HK" => ("Asia/Hong_Kong", "zh-HK", "zh-HK,zh;q=0.9,en-US;q=0.8,en;q=0.7"),
            _ => return None,
        };

        Some(GeoIpMetadata {
            country_code: code,
            timezone: tz.to_string(),
            default_lang: lang.to_string(),
            accept_lang: accept.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_country_mappings() {
        let jp = GeoIpResolver::resolve_country("jp").expect("Should resolve JP");
        assert_eq!(jp.country_code, "JP");
        assert_eq!(jp.timezone, "Asia/Tokyo");
        assert_eq!(jp.default_lang, "ja-JP");

        let us = GeoIpResolver::resolve_country("US").expect("Should resolve US");
        assert_eq!(us.timezone, "America/New_York");
        assert_eq!(us.default_lang, "en-US");

        let vn = GeoIpResolver::resolve_country("vn").expect("Should resolve VN");
        assert_eq!(vn.timezone, "Asia/Ho_Chi_Minh");
        assert_eq!(vn.default_lang, "vi-VN");

        assert!(GeoIpResolver::resolve_country("UNKNOWN_XX").is_none());
    }
}
