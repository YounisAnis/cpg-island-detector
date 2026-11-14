from app.windows import encode_bases, window_starts


def test_ambiguity_and_partial_tail():
    assert window_starts(encode_bases("R" * 20 + "A" * 180)).tolist() == [0]
    assert window_starts(encode_bases("U" * 21 + "A" * 179)).tolist() == []
    assert window_starts(encode_bases("A" * 299)).tolist() == [0, 50]
    assert window_starts(encode_bases("A" * 199)).tolist() == []
