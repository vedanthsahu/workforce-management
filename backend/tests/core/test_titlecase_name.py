from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.core.text import titlecase_name


class TitlecaseNameTests(unittest.TestCase):
    def test_lowercase_name_gets_capitalized(self) -> None:
        self.assertEqual(titlecase_name("amit kumar"), "Amit Kumar")

    def test_uppercase_name_gets_normalized_down(self) -> None:
        self.assertEqual(titlecase_name("KISHORE NANDAN"), "Kishore Nandan")

    def test_mixed_case_gets_normalized(self) -> None:
        self.assertEqual(titlecase_name("aMiT kUmAr"), "Amit Kumar")

    def test_extra_internal_whitespace_is_collapsed(self) -> None:
        self.assertEqual(titlecase_name("kishore    nandan"), "Kishore Nandan")

    def test_leading_and_trailing_whitespace_is_trimmed(self) -> None:
        self.assertEqual(titlecase_name("  amit kumar  "), "Amit Kumar")

    def test_hyphenated_name_capitalizes_each_part(self) -> None:
        self.assertEqual(titlecase_name("mary-jane parker"), "Mary-Jane Parker")

    def test_apostrophe_name_capitalizes_each_part(self) -> None:
        self.assertEqual(titlecase_name("liam o'brien"), "Liam O'Brien")

    def test_single_name_still_capitalizes(self) -> None:
        self.assertEqual(titlecase_name("madonna"), "Madonna")

    def test_none_passes_through_unchanged(self) -> None:
        """Callers use this to distinguish 'not supplied' from 'empty' in
        optional-update paths (e.g. update_user_profile's COALESCE)."""
        self.assertIsNone(titlecase_name(None))

    def test_empty_string_passes_through_unchanged(self) -> None:
        self.assertEqual(titlecase_name(""), "")

    def test_whitespace_only_becomes_empty_string(self) -> None:
        self.assertEqual(titlecase_name("   "), "")


if __name__ == "__main__":
    unittest.main()
