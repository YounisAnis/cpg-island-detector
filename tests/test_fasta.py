import pytest

from app.fasta import InputError, parse_records


def parse(text, **kwargs):
    return parse_records(text, max_bases=kwargs.get("max_bases", 500000), max_records=kwargs.get("max_records", 10))


def test_raw_and_fasta():
    assert parse(" ac gt\n" * 50)[0].sequence == "ACGT" * 50
    seq = "N" * 200
    ids = [r.id for r in parse(f">chr1 note\n{seq}\n>chr1\n{seq}\n>chr1_2\n{seq}")]
    assert ids == ["chr1", "chr1_2", "chr1_2_2"]
    names = [r.id for r in parse((">" + "z"*80 + "\n" + seq + "\n") * 2)]
    assert len(set(names)) == 2 and all(len(n) == 64 for n in names)


@pytest.mark.parametrize("text,code", [
    ("  ", "empty_input"), (">empty", "invalid_fasta"), ("ACG", "too_short"),
    ("A" * 199 + "ß", "invalid_character"), ("AC\n7", "invalid_character"),
])
def test_invalid(text, code):
    with pytest.raises(InputError) as error:
        parse(text)
    assert error.value.code == code
