"""Assemble les données publiques du site à partir d'un export de la base (cartes, semaines, fiches, parcours).
Usage : python3 build_data.py <dossier_export> <dossier_site>
"""
import json, os, sys, glob

exp, site = sys.argv[1], sys.argv[2]
PRIVE = {"niveau", "prochaine"}  # état de révision : jamais publié

def load_dir(name):
    out = {}
    for p in glob.glob(os.path.join(exp, name, "*.json")):
        out[os.path.splitext(os.path.basename(p))[0]] = json.load(open(p))
    return out

cartes, semaines, fiches = load_dir("cartes"), load_dir("semaines"), load_dir("fiches")
plan = load_dir("parcours").get("plan", {})

os.makedirs(os.path.join(site, "data", "cartes"), exist_ok=True)
meta = []
for date, c in sorted(cartes.items()):
    c = {k: v for k, v in c.items() if k not in PRIVE}
    c["date"] = date
    json.dump(c, open(os.path.join(site, "data", "cartes", date + ".json"), "w"), ensure_ascii=False)
    meta.append({k: c.get(k) for k in ("date", "semaine", "numero", "rang", "etape", "titre")})

index = {
    "semaines": [dict({k: v for k, v in s.items()}, id=i) for i, s in sorted(semaines.items())],
    "cartes": meta,
    "aVenir": plan.get("suivantes", []),
    "prochaine": plan.get("choix"),
}
json.dump(index, open(os.path.join(site, "data", "index.json"), "w"), ensure_ascii=False)
json.dump({"fiches": {i: {k: v for k, v in f.items() if k not in PRIVE} for i, f in sorted(fiches.items())}},
          open(os.path.join(site, "data", "fiches.json"), "w"), ensure_ascii=False)
print(f"{len(meta)} cartes, {len(semaines)} semaines, {len(fiches)} fiches")
