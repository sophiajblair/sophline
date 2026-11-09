"""Builds the SQLite database.

DATA PROVENANCE: Airbnb and Skyscanner publish no open bulk data (Airbnb scraping breaches its ToS,
Skyscanner needs a partner API key). This script therefore SIMULATES data that follows the real schemas
(Inside Airbnb listings.csv / Skyscanner flight quotes) with seeded, documented relationships plus
injected data-quality problems (missing prices, outliers, duplicates) to be cleaned in analysis.py.
To use real data: load Inside Airbnb CSVs into `listing` and Skyscanner quotes into `flight_quote`
(see README) and re-run analysis.py unchanged.
"""
import sqlite3, pathlib, numpy as np, pandas as pd
rng = np.random.default_rng(42)
ROOT = pathlib.Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "travel.db"

# city, country, region, climate, cost_index, distance_km (from Dublin), lat (drives temp), base summer temp
DEST = [
 ("Lisbon","Portugal","Southern Europe","Mediterranean",0.85,1650,38.7),("Barcelona","Spain","Southern Europe","Mediterranean",1.05,1470,41.4),
 ("Rome","Italy","Southern Europe","Mediterranean",1.10,1900,41.9),("Athens","Greece","Southern Europe","Mediterranean",0.85,2800,37.98),
 ("Malaga","Spain","Southern Europe","Mediterranean",0.80,1900,36.7),("Dubrovnik","Croatia","Southern Europe","Mediterranean",0.95,2250,42.65),
 ("Paris","France","Western Europe","Temperate",1.35,780,48.9),("Amsterdam","Netherlands","Western Europe","Temperate",1.30,750,52.4),
 ("Berlin","Germany","Western Europe","Temperate",1.05,1320,52.5),("Edinburgh","UK","Western Europe","Temperate",1.15,280,55.95),
 ("Prague","Czechia","Central Europe","Continental",0.80,1700,50.1),("Budapest","Hungary","Central Europe","Continental",0.75,1900,47.5),
 ("Krakow","Poland","Central Europe","Continental",0.70,1800,50.06),("Vienna","Austria","Central Europe","Continental",1.20,1700,48.2),
 ("Reykjavik","Iceland","Northern Europe","Temperate",1.55,1500,64.1),("Copenhagen","Denmark","Northern Europe","Temperate",1.50,1100,55.7),
 ("Tenerife","Spain","Atlantic Islands","Tropical",0.90,2900,28.3),("Marrakech","Morocco","North Africa","Mediterranean",0.55,2400,31.6),
 ("Istanbul","Turkey","Eastern Med","Mediterranean",0.60,3000,41.0),("Bali","Indonesia","Asia","Tropical",0.45,12500,-8.4),
]
AIRLINES = [("Ryanair","Low-cost"),("easyJet","Low-cost"),("Wizz Air","Low-cost"),("Aer Lingus","Full-service"),
            ("Lufthansa","Full-service"),("KLM","Full-service"),("TAP","Full-service"),("Turkish","Full-service")]

def build():
    DB.parent.mkdir(exist_ok=True)
    if DB.exists(): DB.unlink()
    con = sqlite3.connect(DB); con.executescript((ROOT/"sql"/"schema.sql").read_text())
    dest = pd.DataFrame(DEST, columns=["city","country","region","climate_zone","cost_index","distance_km","lat"])
    dest.insert(0,"dest_id",range(1,len(dest)+1))
    dest.drop(columns="lat").to_sql("destination",con,if_exists="append",index=False)
    pd.DataFrame(AIRLINES,columns=["name","carrier_type"]).assign(airline_id=range(1,9))[["airline_id","name","carrier_type"]]\
      .to_sql("airline",con,if_exists="append",index=False)

    # monthly climate + occupancy (summer peak; tropical = dry season Apr-Oct)
    rows=[]
    for _,d in dest.iterrows():
        for m in range(1,13):
            seas = np.cos((m-7)*np.pi/6)                       # 1 in July, -1 in Jan
            if d.climate_zone=="Tropical" and d.lat<0: seas = 0.3*np.cos((m-8)*np.pi/6)
            mean = min(38-0.53*abs(d.lat), 27.5)                      # annual mean falls with latitude
            amp = {"Mediterranean":9,"Continental":11,"Temperate":7.5,"Tropical":1.5}[d.climate_zone]
            temp = mean + amp*seas + rng.normal(0,.7)
            rain = max(5,70-35*seas*(1 if d.climate_zone=="Mediterranean" else .3)+rng.normal(0,10)+(60 if d.city=="Bali" and m in(11,12,1,2,3) else 0))
            occ  = np.clip(62+22*seas+rng.normal(0,4)+(8 if d.city in("Paris","Rome","Barcelona") else 0),30,99)
            pidx = 1+0.28*seas*(1 if d.climate_zone!="Tropical" else .4)+rng.normal(0,.02)
            rows.append((d.dest_id,m,round(temp,1),round(rain,1),round(occ,1),round(pidx,3)))
    pd.DataFrame(rows,columns=["dest_id","month","avg_temp_c","rainfall_mm","occupancy_pct","price_index"]).to_sql("monthly_climate",con,if_exists="append",index=False)
    clim = pd.DataFrame(rows,columns=["dest_id","month","t","r","occ","pidx"]).set_index(["dest_id","month"])

    # hosts + listings
    nh, nl = 2500, 6000
    host = pd.DataFrame({"host_id":range(1,nh+1),
        "host_since":pd.to_datetime("2012-01-01")+pd.to_timedelta(rng.integers(0,365*12,nh),unit="D"),
        "is_superhost":rng.random(nh)<0.22})
    host["host_since"]=host.host_since.dt.strftime("%Y-%m-%d"); host["is_superhost"]=host.is_superhost.astype(int)
    host.to_sql("host",con,if_exists="append",index=False)
    popw = dest.cost_index**0.3*np.array([1.3,1.4,1.4,.8,.9,.6,1.4,1.2,1.0,.9,1.0,.9,.7,1,.5,.8,.8,.6,.9,.8]); popw/=popw.sum()
    L = pd.DataFrame({"listing_id":range(1,nl+1),"dest_id":rng.choice(dest.dest_id,nl,p=popw),"host_id":rng.integers(1,nh+1,nl)})
    L["room_type"]=rng.choice(["Entire home/apt","Private room","Shared room","Hotel room"],nl,p=[.62,.28,.03,.07])
    L["bedrooms"]=np.where(L.room_type=="Entire home/apt",rng.choice([0,1,2,3,4],nl,p=[.08,.42,.30,.15,.05]),np.where(L.room_type=="Hotel room",1,1))
    L["max_guests"]=np.clip(L.bedrooms*2+rng.integers(0,3,nl),1,10)
    L["dist_centre_km"]=np.round(rng.gamma(2.0,1.6,nl),2)
    L["amenities_cnt"]=np.clip(rng.normal(22,8,nl),3,60).astype(int)
    L["instant_book"]=(rng.random(nl)<.4).astype(int); L["min_nights"]=rng.choice([1,2,3,5,7,30],nl,p=[.35,.3,.15,.08,.07,.05])
    sup = host.set_index("host_id").is_superhost.reindex(L.host_id).values
    L["rating"]=np.clip(rng.normal(4.55+0.18*sup,.35),1,5).round(2)
    L["n_reviews"]=rng.poisson(np.where(L.instant_book==1,30,20)*(1+.4*sup))
    ci = dest.set_index("dest_id").cost_index.reindex(L.dest_id).values
    rt = L.room_type.map({"Entire home/apt":1.0,"Private room":.55,"Shared room":.35,"Hotel room":.9}).values
    logp = (np.log(70)+1.0*np.log(ci)+np.log(rt)+.20*np.log1p(L.bedrooms)+.09*sup-.035*L.dist_centre_km
            +.004*(L.amenities_cnt-22)+.10*(L.rating-4.5)+rng.normal(0,.28,nl))
    L["price_night"]=np.exp(logp).round(0)
    # --- injected data-quality issues
    L.loc[rng.choice(nl,150,replace=False),"price_night"]=np.nan
    L.loc[rng.choice(nl,40,replace=False),"price_night"]*=15                # entry errors
    L.loc[L.n_reviews==0,"rating"]=np.nan
    dups = L.sample(60,random_state=1).copy(); dups["listing_id"]=range(nl+1,nl+61)   # duplicate listings
    L=pd.concat([L,dups]); L.to_sql("listing",con,if_exists="append",index=False)

    # reviews: templated text, sentiment tied to rating
    pos=["great location","spotless and comfortable","host was very helpful","lovely view","great value for money","easy check-in","quiet and cosy"]
    neg=["noisy at night","dirty on arrival","host slow to reply","misleading photos","overpriced for what you get","hard to find","uncomfortable bed"]
    nr=15000; lid=rng.choice(L.listing_id.values[:nl],nr); r=L.set_index("listing_id").rating.reindex(lid).fillna(4.3).values
    stars=np.clip(np.round(r+rng.normal(0,.7,nr)),1,5).astype(int)
    com=[ " and ".join(rng.choice(pos if s>=4 else neg if s<=2 else pos+neg, 2, replace=False)) for s in stars]
    pd.DataFrame({"review_id":range(1,nr+1),"listing_id":lid,
       "review_date":(pd.to_datetime("2024-01-01")+pd.to_timedelta(rng.integers(0,900,nr),unit="D")).strftime("%Y-%m-%d"),
       "stars":stars,"comment":com}).to_sql("review",con,if_exists="append",index=False)

    # flight quotes (Skyscanner-like): LCC cheaper; U-shaped booking-window effect; summer premium; stops reduce price
    nq=30000; q=pd.DataFrame({"quote_id":range(1,nq+1),"dest_id":rng.choice(dest.dest_id,nq),"airline_id":rng.integers(1,9,nq)})
    dd=dest.set_index("dest_id"); q["depart_date"]=pd.to_datetime("2026-01-01")+pd.to_timedelta(rng.integers(0,365,nq),unit="D")
    q["days_before"]=np.clip(rng.gamma(2.2,22,nq),0,300).astype(int)
    km=dd.distance_km.reindex(q.dest_id).values; lcc=q.airline_id.isin([1,2,3]).values; mo=q.depart_date.dt.month.values
    window=1+.0000045*(q.days_before-45)**2*10+np.where(q.days_before<7,.35,0)
    summer=1+.35*np.cos((mo-7.5)*np.pi/6).clip(0)+np.where(np.isin(mo,[12]),.15,0)
    q["stops"]=np.where(km>8000,rng.choice([1,2],nq,p=[.75,.25]),rng.choice([0,1],nq,p=[.8,.2]))
    price=(35+.055*km**.95)*np.where(lcc,.62,1.0)*window*summer*np.where(q.stops>0,.88,1)*rng.lognormal(0,.18,nq)
    q["price_eur"]=price.round(2); q["duration_h"]=(km/780+.7+q.stops*2.2+rng.normal(0,.25,nq)).round(2)
    q["depart_date"]=q.depart_date.dt.strftime("%Y-%m-%d"); q["airline_id"]=q.airline_id.astype(int)
    q.to_sql("flight_quote",con,if_exists="append",index=False)
    con.commit(); con.close(); print("built",DB)
if __name__=="__main__": build()
