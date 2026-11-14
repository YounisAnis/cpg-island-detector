"""Normalize records and report positions in the whitespace-stripped input (one-based)."""

from dataclasses import dataclass

from .settings import WIDTH


class InputError(ValueError):
    def __init__(self, status, code, message, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.details = details


@dataclass(frozen=True, slots=True)
class Record:
    id: str
    sequence: str


def parse_records(text, *, max_bases, max_records):
    text = text.strip()
    if not text:
        raise InputError(400, "empty_input", "Enter a DNA sequence or FASTA record.")
    records = []
    used = set()
    total = 0

    def finish(name, fragments):
        nonlocal total
        raw = "".join(fragments)
        if not raw:
            raise InputError(400, "invalid_fasta", "FASTA record has no sequence.", record=name)
        for position, base in enumerate(raw, start=1):
            if not ("A" <= base <= "Z" or "a" <= base <= "z"):
                raise InputError(422, "invalid_character", f"Invalid character at position {position}.",
                                 record=name, position=position)
        if len(raw) < WIDTH:
            raise InputError(422, "too_short", f"Each record requires at least {WIDTH} bases.", record=name)
        total += len(raw)
        if total > max_bases:
            raise InputError(422, "too_many_bases", "Input exceeds the total base limit.")
        if len(records) >= max_records:
            raise InputError(422, "too_many_records", "Input exceeds the record limit.")
        number = 1
        identifier = name[:64]
        while identifier in used:
            number += 1
            suffix = f"_{number}"
            identifier = name[:64 - len(suffix)] + suffix
        used.add(identifier)
        records.append(Record(identifier, raw.upper()))

    if not text.startswith(">"):
        finish("sequence_1", ["".join(text.split())])
        return records
    name = None
    fragments = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith(">"):
            if name is not None:
                finish(name, fragments)
            header = line[1:].split(maxsplit=1)
            name = header[0] if header else f"sequence_{len(records) + 1}"
            fragments = []
        else:
            fragments.append("".join(line.split()))
    finish(name, fragments)
    return records
