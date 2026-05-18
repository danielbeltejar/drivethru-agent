"""
Router de transcripción de audio para COSMO BURGER.

Recibe grabaciones de audio desde el frontend (WAV) y las transcribe
usando faster-whisper con el modelo small en español.
"""

import os
import tempfile
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException

transcribe_router = APIRouter()
logger = logging.getLogger(__name__)

_model = None
MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")


def _get_model():
    global _model
    if _model is None:
        logger.info(f"Cargando modelo Whisper '{MODEL_SIZE}'...")
        from faster_whisper import WhisperModel

        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        logger.info("Modelo Whisper cargado.")
    return _model


@transcribe_router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    if not audio.filename or not audio.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos WAV")

    suffix = ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        model = _get_model()
        segments, _info = model.transcribe(tmp_path, language="es", beam_size=5)
        text = " ".join([s.text for s in segments])
        return {"text": text.strip()}
    except Exception as e:
        logger.error(f"Transcripción fallida: {e}")
        raise HTTPException(status_code=500, detail="Error al transcribir el audio")
    finally:
        os.unlink(tmp_path)
