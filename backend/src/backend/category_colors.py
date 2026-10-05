"""Approved chart tokens; the frontend resolves these using globals.css."""

from typing import Literal, get_args

CategoryColor = Literal[
    "chart-emerald-2", "chart-red-2", "chart-amber-2", "chart-blue-2",
    "chart-cyan-2", "chart-fuchsia-2", "chart-green-2", "chart-indigo-2",
    "chart-lime-2", "chart-orange-2", "chart-pink-2", "chart-purple-2",
    "chart-rose-2", "chart-sky-2", "chart-teal-2", "chart-violet-2", "chart-yellow-2",
]
COLOR_TOKENS = get_args(CategoryColor)
DEFAULT_CATEGORY_COLOR = "chart-blue-2"
