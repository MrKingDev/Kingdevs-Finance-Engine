from pydantic import BaseModel, ConfigDict, field_validator

REGIONS = {
    "en-US": "United States", "en-GB": "United Kingdom", "en-CA": "Canada",
    "en-AU": "Australia", "en-NZ": "New Zealand", "de-DE": "Germany",
    "fr-FR": "France", "es-ES": "Spain", "it-IT": "Italy",
    "de-CH": "Switzerland", "ja-JP": "Japan", "zh-CN": "China",
    "en-IN": "India", "es-MX": "Mexico", "pt-BR": "Brazil",
}
CURRENCIES = {
    "USD": "US dollar", "EUR": "Euro", "GBP": "British pound",
    "CAD": "Canadian dollar", "AUD": "Australian dollar", "NZD": "New Zealand dollar",
    "CHF": "Swiss franc", "JPY": "Japanese yen", "CNY": "Chinese yuan",
    "INR": "Indian rupee", "MXN": "Mexican peso", "BRL": "Brazilian real",
}
TIME_ZONES = {
    "America/New_York": "Eastern Time (EST/EDT)",
    "America/Chicago": "Central Time (CST/CDT)",
    "America/Denver": "Mountain Time (MST/MDT)",
    "America/Phoenix": "Arizona (MST)",
    "America/Los_Angeles": "Pacific Time (PST/PDT)",
    "America/Anchorage": "Alaska Time", "Pacific/Honolulu": "Hawaii Time",
    "America/Toronto": "Toronto", "America/Vancouver": "Vancouver",
    "America/Mexico_City": "Mexico City", "America/Sao_Paulo": "São Paulo",
    "Europe/London": "London", "Europe/Berlin": "Berlin",
    "Europe/Paris": "Paris", "Europe/Madrid": "Madrid", "Europe/Rome": "Rome",
    "Europe/Zurich": "Zurich", "Asia/Tokyo": "Tokyo", "Asia/Shanghai": "Shanghai",
    "Asia/Kolkata": "India", "Australia/Sydney": "Sydney",
    "Australia/Perth": "Perth", "Pacific/Auckland": "Auckland", "UTC": "UTC",
}


class PreferencesWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    locale: str = "en-US"
    currency: str = "USD"
    time_zone: str = "America/New_York"

    @field_validator("locale", "currency", "time_zone")
    @classmethod
    def supported_value(cls, value, info):
        options = {"locale": REGIONS, "currency": CURRENCIES, "time_zone": TIME_ZONES}
        if value not in options[info.field_name]:
            raise ValueError(f"Choose a supported {info.field_name.replace('_', ' ')}.")
        return value
