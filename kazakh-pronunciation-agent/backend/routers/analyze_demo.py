"""Pronunciation analysis router тАФ /api/analyze (DEMO MODE тАФ mock analyzer, no OpenAI)."""

import re
import math
import random
import asyncio
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form

router = APIRouter()


# тФАтФА Mock phonetic issues database тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
PHONETIC_DB = {
    "the":       {"category": "th-sound",   "ipa_correct": "/├░╔Щ/",     "common_error": "╨Ч╨░╨╝╨╡╨╜╨░ /├░/ ╨╜╨░ /d/ ╨╕╨╗╨╕ /z/",      "issue": "Voiced TH",     "tip": "╨Я╨╛╨╝╨╡╤Б╤В╨╕╤В╨╡ ╨║╨╛╨╜╤З╨╕╨║ ╤П╨╖╤Л╨║╨░ ╨╝╨╡╨╢╨┤╤Г ╨╖╤Г╨▒╨░╨╝╨╕ ╨╕ ╨┐╤А╨╛╨╕╨╖╨╜╨╡╤Б╨╕╤В╨╡ ╨╖╨▓╨╛╨╜╨║╨╕╨╣ ╨╖╨▓╤Г╨║. ╨Э╨╡ ╨╖╨░╨╝╨╡╨╜╤П╨╣╤В╨╡ ╨╜╨░ /╨┤/ ╨╕╨╗╨╕ /╨╖/."},
    "this":      {"category": "th-sound",   "ipa_correct": "/├░╔кs/",    "common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨║╨░╨║ '╨┤╨╕╤Б' ╨╕╨╗╨╕ '╨╖╨╕╤Б'", "issue": "Voiced TH",     "tip": "╨п╨╖╤Л╨║ ╨┤╨╛╨╗╨╢╨╡╨╜ ╨▒╤Л╤В╤М ╨╝╨╡╨╢╨┤╤Г ╨╖╤Г╨▒╨░╨╝╨╕. ╨Ч╨▓╤Г╨║ /├░/ тАФ ╨╖╨▓╨╛╨╜╨║╨╕╨╣, ╨▓╨╕╨▒╤А╨░╤Ж╨╕╤П ╨▓ ╨│╨╛╤А╨╗╨╡."},
    "that":      {"category": "th-sound",   "ipa_correct": "/├░├жt/",    "common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨║╨░╨║ '╨┤╤Н╤В'",          "issue": "Voiced TH",     "tip": "╨Э╨╡ ╨╖╨░╨╝╨╡╨╜╤П╨╣╤В╨╡ /├░/ ╨╜╨░ /╨┤/. ╨Ъ╨╛╨╜╤З╨╕╨║ ╤П╨╖╤Л╨║╨░ ╨╝╨╡╨╢╨┤╤Г ╨╖╤Г╨▒╨░╨╝╨╕."},
    "think":     {"category": "th-sound",   "ipa_correct": "/╬╕╔к┼Лk/",   "common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨║╨░╨║ '╤Б╨╕╨╜╨║' ╨╕╨╗╨╕ '╤Д╨╕╨╜╨║'","issue": "Voiceless TH", "tip": "╨У╨╗╤Г╤Е╨╛╨╣ /╬╕/ тАФ ╤П╨╖╤Л╨║ ╨╝╨╡╨╢╨┤╤Г ╨╖╤Г╨▒╨░╨╝╨╕, ╨▒╨╡╨╖ ╨▓╨╕╨▒╤А╨░╤Ж╨╕╨╕. ╨Э╨╡ ╨╖╨░╨╝╨╡╨╜╤П╨╣╤В╨╡ ╨╜╨░ /╤Б/ ╨╕╨╗╨╕ /╤Д/."},
    "three":     {"category": "th-sound",   "ipa_correct": "/╬╕ri╦Р/",   "common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨║╨░╨║ '╤Б╤А╨╕' ╨╕╨╗╨╕ '╤Д╤А╨╕'", "issue": "Voiceless TH", "tip": "╨Э╨░╤З╨╜╨╕╤В╨╡ ╤Б╨╛ ╨╖╨▓╤Г╨║╨░ /╬╕/ (╤П╨╖╤Л╨║ ╨╝╨╡╨╢╨┤╤Г ╨╖╤Г╨▒╨░╨╝╨╕), ╨╖╨░╤В╨╡╨╝ ╨┐╨╗╨░╨▓╨╜╨╛ ╨┐╨╡╤А╨╡╨╣╨┤╨╕╤В╨╡ ╨║ /r/."},
    "through":   {"category": "th-sound",   "ipa_correct": "/╬╕ru╦Р/",   "common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨║╨░╨║ '╤Б╤А╤Г'",           "issue": "Voiceless TH", "tip": "╨У╨╗╤Г╤Е╨╛╨╣ /╬╕/ ╨┐╨╡╤А╨╡╨┤ /r/. ╨п╨╖╤Л╨║ ╨╝╨╡╨╢╨┤╤Г ╨╖╤Г╨▒╨░╨╝╨╕, ╨╖╨░╤В╨╡╨╝ ╨╛╤В╨╛╨┤╨▓╨╕╨╜╤М╤В╨╡ ╨╜╨░╨╖╨░╨┤ ╨┤╨╗╤П /r/."},
    "weather":   {"category": "th-sound",   "ipa_correct": "/╦Иw╔Ы├░╔Щr/", "common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨║╨░╨║ '╨▓╨╡╨╖╨╡╤А'",          "issue": "Voiced TH",     "tip": "╨Т ╤Б╨╡╤А╨╡╨┤╨╕╨╜╨╡ ╤Б╨╗╨╛╨▓╨░ /├░/ ╤В╨╛╨╢╨╡ ╨┐╤А╨╛╨╕╨╖╨╜╨╛╤Б╨╕╤В╤Б╤П ╤Б ╤П╨╖╤Л╨║╨╛╨╝ ╨╝╨╡╨╢╨┤╤Г ╨╖╤Г╨▒╨░╨╝╨╕."},
    "world":     {"category": "w-v",        "ipa_correct": "/w╔Ь╦Рrld/", "common_error": "╨Ч╨░╨╝╨╡╨╜╨░ /w/ ╨╜╨░ /v/",                "issue": "W vs V",        "tip": "╨Ф╨╗╤П /w/ ╨╛╨║╤А╤Г╨│╨╗╨╕╤В╨╡ ╨│╤Г╨▒╤Л ╤В╤А╤Г╨▒╨╛╤З╨║╨╛╨╣, ╨║╨░╨║ ╨▒╤Г╨┤╤В╨╛ ╨╖╨░╨┤╤Г╨▓╨░╨╡╤В╨╡ ╤Б╨▓╨╡╤З╤Г. ╨Э╨╡ ╨║╨░╤Б╨░╨╣╤В╨╡╤Б╤М ╨╖╤Г╨▒╨░╨╝╨╕ ╨│╤Г╨▒."},
    "would":     {"category": "w-v",        "ipa_correct": "/w╩Кd/",    "common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨║╨░╨║ '╨▓╤Г╨┤'",           "issue": "W vs V",        "tip": "╨Ю╨║╤А╤Г╨│╨╗╨╕╤В╨╡ ╨│╤Г╨▒╤Л ╨┤╨╗╤П /w/. ╨н╤В╨╛ ╨╜╨╡ /╨▓/ тАФ ╨│╤Г╨▒╤Л ╨╜╨╡ ╨║╨░╤Б╨░╤О╤В╤Б╤П ╨╖╤Г╨▒╨╛╨▓."},
    "work":      {"category": "w-v",        "ipa_correct": "/w╔Ь╦Рrk/",  "common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨║╨░╨║ '╨▓╨╛╤А╨║'",          "issue": "W vs V",        "tip": "╨Ф╨╗╤П /w/ ╨╛╨║╤А╤Г╨│╨╗╨╕╤В╨╡ ╨│╤Г╨▒╤Л. ╨а╤Г╤Б╤Б╨║╨╕╨╣ /╨▓/ ╨┐╤А╨╛╨╕╨╖╨╜╨╛╤Б╨╕╤В╤Б╤П ╤Б ╤Г╤З╨░╤Б╤В╨╕╨╡╨╝ ╨╖╤Г╨▒╨╛╨▓, ╨░ /w/ тАФ ╨╜╨╡╤В."},
    "very":      {"category": "w-v",        "ipa_correct": "/╦Иv╔Ыri/",  "common_error": "╨б╨╗╨╕╤И╨║╨╛╨╝ ╨╝╤П╨│╨║╨╕╨╣ /v/",               "issue": "V sound",       "tip": "╨Ф╨╗╤П /v/ ╨▓╨╡╤А╤Е╨╜╨╕╨╡ ╨╖╤Г╨▒╤Л ╨┤╨╛╨╗╨╢╨╜╤Л ╨║╨░╤Б╨░╤В╤М╤Б╤П ╨╜╨╕╨╢╨╜╨╡╨╣ ╨│╤Г╨▒╤Л. ╨Ч╨▓╤Г╨║ ╨╖╨▓╨╛╨╜╨║╨╕╨╣."},
    "right":     {"category": "r-l",        "ipa_correct": "/ra╔кt/",   "common_error": "╨а╤Г╤Б╤Б╨║╨╛╨╡ /╤А/ ╨▓╨╝╨╡╤Б╤В╨╛ ╨░╨╜╨│╨╗╨╕╨╣╤Б╨║╨╛╨│╨╛ /r/","issue": "R sound",       "tip": "╨Р╨╜╨│╨╗╨╕╨╣╤Б╨║╨╕╨╣ /r/ тАФ ╤П╨╖╤Л╨║ ╨Э╨Х ╨▓╨╕╨▒╤А╨╕╤А╤Г╨╡╤В. ╨Ч╨░╨│╨╜╨╕╤В╨╡ ╨║╨╛╨╜╤З╨╕╨║ ╤П╨╖╤Л╨║╨░ ╨╜╨░╨╖╨░╨┤, ╨╜╨╡ ╨║╨░╤Б╨░╤П╤Б╤М ╨╜╤С╨▒╨░."},
    "really":    {"category": "r-l",        "ipa_correct": "/╦Иr╔к╔Щli/", "common_error": "╨а╨░╤Б╨║╨░╤В╨╕╤Б╤В╤Л╨╣ ╤А╤Г╤Б╤Б╨║╨╕╨╣ /╤А/",          "issue": "R sound",       "tip": "╨п╨╖╤Л╨║ ╨╖╨░╨│╨╜╤Г╤В ╨╜╨░╨╖╨░╨┤, ╨║╨╛╨╜╤З╨╕╨║ ╨╜╨╡ ╨║╨░╤Б╨░╨╡╤В╤Б╤П ╨╜╤С╨▒╨░. ╨С╨╡╨╖ ╨▓╨╕╨▒╤А╨░╤Ж╨╕╨╕."},
    "little":    {"category": "r-l",        "ipa_correct": "/╦Иl╔кt╔Щl/", "common_error": "╨Ь╤П╨│╨║╨╕╨╣ /╨╗/ ╨▓╨╝╨╡╤Б╤В╨╛ ╤В╤С╨╝╨╜╨╛╨│╨╛ /l/",    "issue": "Dark L",        "tip": "╨Т ╨║╨╛╨╜╤Ж╨╡ ╤Б╨╗╨╛╨▓╨░ /l/ ╨┐╤А╨╛╨╕╨╖╨╜╨╛╤Б╨╕╤В╤Б╤П '╤В╤С╨╝╨╜╨╛' тАФ ╨╖╨░╨┤╨╜╤П╤П ╤З╨░╤Б╤В╤М ╤П╨╖╤Л╨║╨░ ╨┐╨╛╨┤╨╜╤П╤В╨░ ╨║ ╨╜╤С╨▒╤Г."},
    "comfortable":{"category": "vowel",     "ipa_correct": "/╦Иk╩Мmft╔Щbl/","common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╨▓╤Б╨╡╤Е ╤Б╨╗╨╛╨│╨╛╨▓",       "issue": "Syllable reduction","tip": "╨Т ╤А╨░╨╖╨│╨╛╨▓╨╛╤А╨╜╨╛╨╣ ╤А╨╡╤З╨╕ ╨┐╤А╨╛╨╕╨╖╨╜╨╛╤Б╨╕╤В╤Б╤П ╨║╨░╨║ '╨ЪA╨Ь╨д-╤В╤Н-╨▒╨╗', ╨░ ╨╜╨╡ '╨║╨╛╨╝-╤Д╨╛╤А-╤В╨░-╨▒╨╗'."},
    "interesting":{"category": "vowel",     "ipa_correct": "/╦И╔кntr╔Щst╔к┼Л/","common_error": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╤З╨╡╤В╤Л╤А╤С╤Е ╤Б╨╗╨╛╨│╨╛╨▓",   "issue": "Syllable reduction","tip": "╨Я╤А╨╛╨╕╨╖╨╜╨╛╤Б╨╕╤В╨╡ ╨║╨░╨║ '╨Ш╨Э-╤В╤А╤Н╤Б-╤В╨╕╨╜╨│' (3 ╤Б╨╗╨╛╨│╨░), ╨░ ╨╜╨╡ '╨╕╨╜-╤В╨╡-╤А╨╡╤Б-╤В╨╕╨╜╨│'."},
    "important": {"category": "stress",     "ipa_correct": "/╔кm╦Иp╔Ф╦Рrt╔Щnt/","common_error": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨┐╨╡╤А╨▓╤Л╨╣ ╤Б╨╗╨╛╨│",      "issue": "Word stress",   "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨▓╤В╨╛╤А╨╛╨╣ ╤Б╨╗╨╛╨│: ╨╕╨╝-╨Я╨Ю╨а-╤В╤Н╨╜╤В. ╨Э╨╡ '╨Ш╨Ь-╨┐╨╛╤А-╤В╨░╨╜╤В'."},
    "development":{"category": "stress",    "ipa_correct": "/d╔к╦Иv╔Ыl╔Щpm╔Щnt/","common_error": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╤В╤А╨╡╤В╨╕╨╣ ╤Б╨╗╨╛╨│",      "issue": "Word stress",   "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨▓╤В╨╛╤А╨╛╨╣ ╤Б╨╗╨╛╨│: ╨┤╨╕-╨Т╨Х-╨╗╨╛╨┐-╨╝╤Н╨╜╤В."},
}

STRESS_DB = {
    "important":   {"correct_stress": "im-POR-tant",      "common_mistake": "IM-por-tant",    "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨┐╨░╨┤╨░╨╡╤В ╨╜╨░ ╨▓╤В╨╛╤А╨╛╨╣ ╤Б╨╗╨╛╨│: ╨╕╨╝-╨Я╨Ю╨а-╤В╤Н╨╜╤В."},
    "interesting": {"correct_stress": "IN-ter-est-ing",    "common_mistake": "in-ter-EST-ing", "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨┐╨╡╤А╨▓╤Л╨╣ ╤Б╨╗╨╛╨│: ╨Ш╨Э-╤В╤Н-╤А╤Н╤Б-╤В╨╕╨╜╨│."},
    "comfortable": {"correct_stress": "COMF-ta-ble",       "common_mistake": "com-FOR-ta-ble", "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨┐╨╡╤А╨▓╤Л╨╣ ╤Б╨╗╨╛╨│, ╨╕ ╤Б╨╗╨╛╨▓╨╛ ╤Б╨╛╨║╤А╨░╤Й╨░╨╡╤В╤Б╤П ╨┤╨╛ 3 ╤Б╨╗╨╛╨│╨╛╨▓."},
    "development": {"correct_stress": "de-VEL-op-ment",    "common_mistake": "de-vel-OP-ment", "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨▓╤В╨╛╤А╨╛╨╣ ╤Б╨╗╨╛╨│: ╨┤╨╕-╨Т╨Х-╨╗╨╛╨┐-╨╝╤Н╨╜╤В."},
    "photograph":  {"correct_stress": "PHO-to-graph",      "common_mistake": "pho-TO-graph",   "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨┐╨╡╤А╨▓╤Л╨╣ ╤Б╨╗╨╛╨│: ╨д╨Ю-╤В╨╛-╨│╤А╨░╤Д."},
    "photography": {"correct_stress": "pho-TOG-ra-phy",    "common_mistake": "PHO-tog-ra-phy", "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╤Б╨╝╨╡╤Й╨░╨╡╤В╤Б╤П ╨╜╨░ ╨▓╤В╨╛╤А╨╛╨╣ ╤Б╨╗╨╛╨│: ╤Д╨╛-╨в╨Ю╨У-╤А╨░-╤Д╨╕."},
    "beginning":   {"correct_stress": "be-GIN-ning",       "common_mistake": "BE-gin-ning",    "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨▓╤В╨╛╤А╨╛╨╣ ╤Б╨╗╨╛╨│: ╨▒╨╕-╨У╨Ш╨Э-╨╜╨╕╨╜╨│."},
    "beautiful":   {"correct_stress": "BEAU-ti-ful",       "common_mistake": "beau-TI-ful",    "tip": "╨г╨┤╨░╤А╨╡╨╜╨╕╨╡ ╨╜╨░ ╨┐╨╡╤А╨▓╤Л╨╣ ╤Б╨╗╨╛╨│: ╨С╨м╨о-╤В╨╕-╤Д╤Г╨╗."},
}

SUMMARIES_GOOD = [
    "╨Э╨╡╨┐╨╗╨╛╤Е╨╛, ╨╜╨╛ ╨╡╤Б╤В╤М ╨╜╨░╨┤ ╤З╨╡╨╝ ╤А╨░╨▒╨╛╤В╨░╤В╤М. ╨Ю╨▒╤А╨░╤В╨╕╤В╨╡ ╨▓╨╜╨╕╨╝╨░╨╜╨╕╨╡ ╨╜╨░ ╨┐╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡ ╤Б╨╛╨│╨╗╨░╤Б╨╜╤Л╤Е.",
    "╨б╤А╨╡╨┤╨╜╨╕╨╣ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В. ╨а╨╡╨║╨╛╨╝╨╡╨╜╨┤╤Г╤О ╨┐╨╛╤А╨░╨▒╨╛╤В╨░╤В╤М ╨╜╨░╨┤ ╨╕╨╜╤В╨╛╨╜╨░╤Ж╨╕╨╡╨╣ ╨╕ ╤Г╨┤╨░╤А╨╡╨╜╨╕╤П╨╝╨╕.",
    "╨г╨┤╨╛╨▓╨╗╨╡╤В╨▓╨╛╤А╨╕╤В╨╡╨╗╤М╨╜╨╛. ╨Ю╤Б╨╜╨╛╨▓╨╜╤Л╨╡ ╤Б╨╗╨╛╨▓╨░ ╨┐╤А╨╛╨╕╨╖╨╜╨╡╤Б╨╡╨╜╤Л, ╨╜╨╛ ╨┐╨╗╨░╨▓╨╜╨╛╤Б╤В╤М ╤А╨╡╤З╨╕ ╨╜╨╡╨┤╨╛╤Б╤В╨░╤В╨╛╤З╨╜╨░.",
    "╨Я╤А╨╕╨╡╨╝╨╗╨╡╨╝╤Л╨╣ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В. ╨Я╨╛╤А╨░╨▒╨╛╤В╨░╨╣╤В╨╡ ╨╜╨░╨┤ ╤З╤С╤В╨║╨╛╤Б╤В╤М╤О ╨╛╨║╨╛╨╜╤З╨░╨╜╨╕╨╣ ╤Б╨╗╨╛╨▓.",
]

SUMMARIES_MEDIUM = [
    "╨а╨╡╨╖╤Г╨╗╤М╤В╨░╤В ╨╜╨╕╨╢╨╡ ╤Б╤А╨╡╨┤╨╜╨╡╨│╨╛. ╨Ь╨╜╨╛╨│╨╛ ╨╛╤И╨╕╨▒╨╛╨║ ╨▓ ╨┐╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╕ ╨║╨╗╤О╤З╨╡╨▓╤Л╤Е ╨╖╨▓╤Г╨║╨╛╨▓.",
    "╨б╨╗╨░╨▒╤Л╨╣ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В. ╨Ю╨▒╤А╨░╤В╨╕╤В╨╡ ╨╛╤Б╨╛╨▒╨╛╨╡ ╨▓╨╜╨╕╨╝╨░╨╜╨╕╨╡ ╨╜╨░ ╨╖╨▓╤Г╨║╨╕ th, w ╨╕ r.",
    "╨Э╤Г╨╢╨╜╨░ ╤Б╨╡╤А╤М╤С╨╖╨╜╨░╤П ╤А╨░╨▒╨╛╤В╨░ ╨╜╨░╨┤ ╨┐╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╨╡╨╝. ╨а╨╡╨║╨╛╨╝╨╡╨╜╨┤╤Г╤О ╨╖╨░╨╝╨╡╨┤╨╗╨╕╤В╤М ╤В╨╡╨╝╨┐ ╤А╨╡╤З╨╕.",
    "╨Ь╨╜╨╛╨│╨╛ ╨┐╤А╨╛╨┐╤Г╤Й╨╡╨╜╨╜╤Л╤Е ╨╕ ╨╜╨╡╨┐╤А╨░╨▓╨╕╨╗╤М╨╜╨╛ ╨┐╤А╨╛╨╕╨╖╨╜╨╡╤Б╤С╨╜╨╜╤Л╤Е ╤Б╨╗╨╛╨▓. ╨Я╤А╨╛╤Б╨╗╤Г╤И╨░╨╣╤В╨╡ ╤Н╤В╨░╨╗╨╛╨╜ ╨╕ ╨┐╨╛╨▓╤В╨╛╤А╨╕╤В╨╡.",
]

SUMMARIES_LOW = [
    "╨Ю╤З╨╡╨╜╤М ╤Б╨╗╨░╨▒╤Л╨╣ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В. ╨С╨╛╨╗╤М╤И╨╕╨╜╤Б╤В╨▓╨╛ ╤Б╨╗╨╛╨▓ ╨╜╨╡ ╤А╨░╤Б╨┐╨╛╨╖╨╜╨░╨╜╨╛. ╨Я╨╛╨┐╤А╨╛╨▒╤Г╨╣╤В╨╡ ╨│╨╛╨▓╨╛╤А╨╕╤В╤М ╨╝╨╡╨┤╨╗╨╡╨╜╨╜╨╡╨╡.",
    "╨Ъ╤А╨╕╤В╨╕╤З╨╡╤Б╨║╨╕ ╨╜╨╕╨╖╨║╨╕╨╣ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В. ╨а╨╡╨║╨╛╨╝╨╡╨╜╨┤╤Г╤О ╨╜╨░╤З╨░╤В╤М ╤Б ╨┐╤А╨╛╤Б╨╗╤Г╤И╨╕╨▓╨░╨╜╨╕╤П ╤Н╤В╨░╨╗╨╛╨╜╨╜╨╛╨│╨╛ ╨┐╤А╨╛╨╕╨╖╨╜╨╛╤И╨╡╨╜╨╕╤П.",
]


def _clamp(val: int, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, val))


def _normal_score(mean: float, std: float) -> int:
    """Generate a score from a truncated normal distribution."""
    val = random.gauss(mean, std)
    return _clamp(round(val))


def _simulate_recognized_text(target: str) -> str:
    """Return target text lowercased with punctuation stripped (simulating raw STT output)."""
    return re.sub(r'[^\w\s\']', '', target).lower().strip()


def _mock_word_analysis(target_words: list[str], overall: int):
    """Create a plausible word_analysis based on the overall score."""
    correct = []
    incorrect = []
    missing = []

    # Higher scores = more correct words
    miss_probability = max(0.02, (100 - overall) / 200)  # 0.02 тАУ 0.35
    incorrect_probability = max(0.05, (100 - overall) / 150)  # 0.05 тАУ 0.45

    for word in target_words:
        roll = random.random()
        if roll < miss_probability and len(word) > 2:
            missing.append({"word": word, "status": "missing"})
        elif roll < miss_probability + incorrect_probability and len(word) > 3:
            # Generate a plausible "spoken_as"
            spoken = word
            if word.startswith("th"):
                spoken = "d" + word[2:] if random.random() > 0.5 else "z" + word[2:]
            elif "w" in word:
                spoken = word.replace("w", "v", 1)
            elif word.endswith("ed"):
                spoken = word[:-2]
            elif word.endswith("ing"):
                spoken = word[:-3] + "in"
            else:
                # swap a vowel
                vowels = "aeiou"
                chars = list(spoken)
                for j, ch in enumerate(chars):
                    if ch in vowels:
                        chars[j] = random.choice([v for v in vowels if v != ch])
                        break
                spoken = "".join(chars)

            similarity = random.randint(55, 85)
            incorrect.append({"word": word, "spoken_as": spoken, "similarity": similarity, "status": "mispronounced"})
        else:
            correct.append({"word": word, "status": "correct"})

    return {
        "correct": correct,
        "incorrect": incorrect,
        "missing": missing,
        "extra": [],
    }


def _mock_phonetic_issues(target_words: list[str], max_issues: int = 3) -> list:
    """Find words in the target that have known phonetic difficulties."""
    issues = []
    lower_words = [w.lower().strip(".,!?;:'\"") for w in target_words]

    for word in lower_words:
        if word in PHONETIC_DB and len(issues) < max_issues:
            entry = PHONETIC_DB[word]
            # Simulate a spoken_as variant
            spoken_as = None
            if word.startswith("th"):
                spoken_as = ("d" if random.random() > 0.5 else "z") + word[2:]
            elif "w" == word[0]:
                spoken_as = "v" + word[1:]
            elif "r" == word[0]:
                spoken_as = word  # Russian rolled r

            issues.append({
                "word": word,
                "spoken_as": spoken_as,
                "category": entry["category"],
                "ipa_correct": entry["ipa_correct"],
                "common_error": entry["common_error"],
                "issue": entry["issue"],
                "tip": entry["tip"],
            })

    return issues


def _mock_stress_issues(target_words: list[str], max_issues: int = 2) -> list:
    """Find words that have known stress problems."""
    issues = []
    lower_words = [w.lower().strip(".,!?;:'\"") for w in target_words]

    for word in lower_words:
        if word in STRESS_DB and len(issues) < max_issues:
            entry = STRESS_DB[word]
            issues.append({
                "word": word,
                "correct_stress": entry["correct_stress"],
                "common_mistake": entry["common_mistake"],
                "tip": entry["tip"],
            })

    return issues


# тФАтФА endpoint тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

@router.post("/api/analyze/demo")
async def analyze_pronunciation(
    target_text: str = Form(""),
    user_text: str = Form(""),
    audio_file: Optional[UploadFile] = File(None),
):
    """DEMO MODE: Mock analysis тАФ no OpenAI calls. Simulates realistic scoring."""

    if not target_text.strip():
        target_text = user_text.strip() or "empty"

    # Consume the audio file if sent (we ignore it but must read to avoid broken pipe)
    if audio_file:
        await audio_file.read()

    # тФАтФА Simulate processing delay тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
    await asyncio.sleep(2.5)

    # тФАтФА Generate realistic scores тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
    # Overall: mean ~66, std ~8 тЖТ most results land in 55-78, rarely touches 85
    overall = _normal_score(mean=66, std=8)
    overall = _clamp(overall, 35, 88)

    # Sub-scores deviate ┬▒5-10 from overall
    accuracy   = _clamp(_normal_score(overall + random.randint(-3, 5), 5), 30, 95)
    fluency    = _clamp(_normal_score(overall + random.randint(-8, 2), 6), 25, 88)
    completeness = _clamp(_normal_score(overall + random.randint(-2, 8), 4), 40, 98)
    intonation = _clamp(_normal_score(overall + random.randint(-10, -2), 7), 20, 82)
    stress     = _clamp(_normal_score(overall + random.randint(-8, 0), 6), 25, 80)

    # тФАтФА Build word analysis тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
    target_words = target_text.split()
    word_analysis = _mock_word_analysis(target_words, overall)

    # тФАтФА Build phonetic and stress issues тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
    phonetic_issues = _mock_phonetic_issues(target_words)
    stress_issues = _mock_stress_issues(target_words)

    # тФАтФА Pick summary тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
    if overall >= 72:
        summary = random.choice(SUMMARIES_GOOD)
    elif overall >= 58:
        summary = random.choice(SUMMARIES_MEDIUM)
    else:
        summary = random.choice(SUMMARIES_LOW)

    # тФАтФА Simulate recognized text (raw STT output) тФАтФАтФАтФА
    recognized = _simulate_recognized_text(target_text)

    return {
        "scores": {
            "overall": overall,
            "accuracy": accuracy,
            "fluency": fluency,
            "completeness": completeness,
            "intonation": intonation,
            "stress": stress,
        },
        "word_analysis": word_analysis,
        "phonetic_issues": phonetic_issues,
        "stress_issues": stress_issues,
        "target_text": target_text,
        "user_text": recognized,
        "summary": summary,
    }
