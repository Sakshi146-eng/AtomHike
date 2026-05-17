"""
UoM (Unit of Measurement) Calculation Engine

Supports all 4 BRD-defined types:
  MIN        — Higher actual is better (e.g. Sales Revenue)
  MAX        — Lower actual is better  (e.g. TAT, Cost, Bug count)
  TIMELINE   — Date-based; on-time = 100%
  ZERO_BASED — Zero = 100% success    (e.g. Safety incidents)
"""

from datetime import datetime
from typing import Optional
from prisma.enums import UoMType

MAX_ACHIEVEMENT_CAP = 2.0  # Cap achievement at 200%


def calculate_achievement(
    uom_type: UoMType,
    target_value: Optional[float] = None,
    actual_value: Optional[float] = None,
    target_date: Optional[datetime] = None,
    actual_date: Optional[datetime] = None,
) -> float:
    """
    Returns achievement as a decimal fraction.
    1.0 = 100%, 1.5 = 150%, 0.8 = 80%
    """
    if uom_type == UoMType.MIN:
        # Higher is better: Achievement / Target
        if not target_value or target_value == 0 or actual_value is None:
            return 0.0
        return min(actual_value / target_value, MAX_ACHIEVEMENT_CAP)

    elif uom_type == UoMType.MAX:
        # Lower is better: Target / Achievement
        if not target_value or actual_value is None:
            return 0.0
        if actual_value == 0:
            return MAX_ACHIEVEMENT_CAP  # Zero achieved = maximum performance
        return min(target_value / actual_value, MAX_ACHIEVEMENT_CAP)

    elif uom_type == UoMType.TIMELINE:
        # Date-based: completed on/before deadline = 100%, else 50%
        if actual_date is None or target_date is None:
            return 0.0
        return 1.0 if actual_date <= target_date else 0.5

    elif uom_type == UoMType.ZERO_BASED:
        # Zero = success; anything else = failure
        if actual_value is None:
            return 0.0
        return 1.0 if actual_value == 0 else 0.0

    return 0.0


def achievement_to_percentage(achievement: float) -> float:
    """Convert decimal to percentage rounded to 2dp."""
    return round(achievement * 100, 2)
