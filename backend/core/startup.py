from backend.ml.inference import GridSentinelInference


def load_all_models() -> GridSentinelInference:
    inf = GridSentinelInference()
    inf.load_models()   # Dev B implements this method
    return inf
