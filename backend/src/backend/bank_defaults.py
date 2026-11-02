"""Built-in bank options; preferences can rename or hide them."""
BANK_DEFAULTS = {'Chase': '#0752a0', 'Bank of America': '#c41230', 'Capital One': '#004977', 'Wells Fargo': '#b31e30', 'Citi': '#004b76', 'American Express': '#006b9c', 'Discover': '#a64700', 'Ally Bank': '#651366', 'TD Bank': '#256b24', 'U.S. Bank': '#263872', 'PNC Bank': '#9a4b00', 'Navy Federal': '#25496b'}


def default_bank_color(name):
    normalized = name.strip().lower()
    for bank, color in BANK_DEFAULTS.items():
        if bank.lower() == normalized:
            return color
    value = 0
    # Match JavaScript's signed 32-bit hash, including UTF-16 code units.
    encoded = normalized.encode("utf-16-le")
    for offset in range(0, len(encoded), 2):
        value = (value * 31 + int.from_bytes(encoded[offset:offset + 2], "little")) & 0xffffffff
    if value >= 0x80000000:
        value -= 0x100000000
    hue = value % 360
    def channel(offset):
        k = (offset + hue / 30) % 12
        return f"{int((0.3 - 0.165 * max(-1, min(k - 3, 9 - k, 1))) * 255 + 0.5):02x}"
    return "#" + channel(0) + channel(8) + channel(4)
