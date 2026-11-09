"""Cleaning -> statistics -> data mining -> recommender. Writes outputs/results.json and outputs/*.png"""
import sqlite3, json, pathlib, warnings, numpy as np, pandas as pd, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt, statsmodels.formula.api as smf
from scipy import stats
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import NMF
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import r2_score, mean_absolute_error, silhouette_score
warnings.filterwarnings("ignore")
ROOT = pathlib.Path(__file__).resolve().parents[1]; OUT = ROOT/"outputs"; OUT.mkdir(exist_ok=True)
con = sqlite3.connect(ROOT/"data"/"travel.db"); R = {}
q = lambda s: pd.read_sql(s, con)

# ---------- 1. CLEANING ----------
L = q("SELECT l.*, d.city, d.country, d.cost_index, d.climate_zone, h.is_superhost FROM listing l JOIN destination d USING(dest_id) JOIN host h USING(host_id)")
R["raw_listings"] = len(L)
key = ["dest_id","host_id","room_type","bedrooms","max_guests","price_night","dist_centre_km","amenities_cnt"]
L = L.drop_duplicates(subset=key); R["duplicates_removed"] = R["raw_listings"]-len(L)
R["missing_price"] = int(L.price_night.isna().sum()); L = L.dropna(subset=["price_night"])
# outliers: IQR rule on log price within destination x room type
lp = np.log(L.price_night); g = lp.groupby([L.dest_id,L.room_type])
med, iqr = g.transform("median"), g.transform(lambda s: s.quantile(.75)-s.quantile(.25))
mask = (lp-med).abs() > 3*iqr.clip(lower=.3); R["outliers_removed"] = int(mask.sum()); L = L[~mask].copy()
L["log_price"] = np.log(L.price_night); R["clean_listings"] = len(L)
F = q("SELECT f.*, a.carrier_type, a.name airline, d.city, d.distance_km FROM flight_quote f JOIN airline a USING(airline_id) JOIN destination d USING(dest_id)")
F["month"] = pd.to_datetime(F.depart_date).dt.month; F["lcc"] = (F.carrier_type=="Low-cost").astype(int)
Fe = F[F.distance_km<8000]   # European short-haul comparable set
R["clean_flights"] = len(F)

# ---------- 2. DESCRIPTIVE ----------
R["price_summary"] = L.price_night.describe().round(1).to_dict()
cityp = L[L.room_type=="Entire home/apt"].groupby("city").price_night.median().sort_values()
R["cheapest_cities_night"] = cityp.head(5).to_dict(); R["priciest_cities_night"] = cityp.tail(5).to_dict()
fig,ax = plt.subplots(figsize=(8,6)); cityp.plot.barh(ax=ax,color="#2a6f97"); ax.set_xlabel("Median nightly price, entire home (EUR)")
ax.set_title("Accommodation cost by destination"); plt.tight_layout(); plt.savefig(OUT/"fig1_city_price.png",dpi=130); plt.close()

# ---------- 3. INFERENTIAL STATISTICS ----------
sh = L[L.is_superhost==1].log_price; ns = L[L.is_superhost==0].log_price
t,p = stats.ttest_ind(sh,ns,equal_var=False)
R["T1_superhost_premium"] = dict(superhost_median=float(L[L.is_superhost==1].price_night.median()), other_median=float(L[L.is_superhost==0].price_night.median()),
    pct_premium=float((np.exp(sh.mean()-ns.mean())-1)*100), t=float(t), p=float(p))
groups = [x.log_price.values for _,x in L.groupby("room_type")]; Fv,pa = stats.f_oneway(*groups); H,pk = stats.kruskal(*groups)
R["T2_roomtype_anova"] = dict(F=float(Fv), p=float(pa), kruskal_H=float(H), kruskal_p=float(pk),
    medians=L.groupby("room_type").price_night.median().to_dict())
lc = Fe[Fe.lcc==1].price_eur; fs = Fe[Fe.lcc==0].price_eur; u,pu = stats.mannwhitneyu(lc,fs)
R["T3_lowcost_vs_full"] = dict(lcc_median=float(lc.median()), full_median=float(fs.median()), p=float(pu))
Fe = Fe.assign(season=pd.cut(Fe.month,[0,2,5,8,11,12],labels=["Winter","Spring","Summer","Autumn","Winter2"]).replace("Winter2","Winter"))
sm = Fe.groupby("season").price_eur.median(); R["T4_season_flight_median"] = sm.round(1).to_dict()
R["T4_kruskal_p"] = float(stats.kruskal(*[x.price_eur for _,x in Fe.groupby("season")]).pvalue)
cr = L[["price_night","rating","amenities_cnt","dist_centre_km","n_reviews","bedrooms"]].corr(method="spearman")["price_night"].round(3).drop("price_night")
R["T5_spearman_with_price"] = cr.to_dict()
# booking-window curve
Fe["bw"] = pd.cut(Fe.days_before,[-1,6,14,30,45,60,90,150,400],labels=["0-6","7-14","15-30","31-45","46-60","61-90","91-150","150+"])
bw = Fe.groupby("bw").price_eur.median(); R["booking_window_median"] = bw.round(1).to_dict(); R["best_window"] = str(bw.idxmin())
fig,ax = plt.subplots(figsize=(7,4)); bw.plot(marker="o",ax=ax,color="#c1121f"); ax.set_ylabel("Median fare (EUR)"); ax.set_xlabel("Days booked before departure")
ax.set_title("Booking-window effect on fares (short-haul)"); plt.tight_layout(); plt.savefig(OUT/"fig2_booking_window.png",dpi=130); plt.close()

# regression (explanatory)
m = smf.ols("log_price ~ np.log(cost_index) + C(room_type) + np.log1p(bedrooms) + is_superhost + dist_centre_km + amenities_cnt", data=L).fit(cov_type="HC3")
R["OLS"] = dict(r2=float(m.rsquared), n=int(m.nobs), coef_pct={k:float((np.exp(v)-1)*100) for k,v in m.params.items() if k in("is_superhost","dist_centre_km","amenities_cnt")},
                cost_elasticity=float(m.params["np.log(cost_index)"]), p_values={k:float(v) for k,v in m.pvalues.items() if k in("is_superhost","dist_centre_km","amenities_cnt")})

# ---------- 4. DATA MINING ----------
X = pd.get_dummies(L[["cost_index","room_type","bedrooms","max_guests","is_superhost","dist_centre_km","amenities_cnt","rating","n_reviews","instant_book","min_nights","climate_zone"]].assign(rating=L.rating.fillna(L.rating.median())),drop_first=True)
y = L.log_price; Xtr,Xte,ytr,yte = train_test_split(X,y,test_size=.25,random_state=0)
lin = LinearRegression().fit(Xtr,ytr); rf = RandomForestRegressor(300,min_samples_leaf=3,n_jobs=-1,random_state=0).fit(Xtr,ytr)
R["ML_price_model"] = dict(linear_r2=float(r2_score(yte,lin.predict(Xte))), rf_r2=float(r2_score(yte,rf.predict(Xte))),
    rf_mae_eur=float(mean_absolute_error(np.exp(yte),np.exp(rf.predict(Xte)))), rf_cv5_r2=float(cross_val_score(rf,X,y,cv=5,scoring="r2").mean()))
imp = pd.Series(rf.feature_importances_,X.columns).sort_values(ascending=False); R["rf_top_features"] = imp.head(6).round(3).to_dict()
fig,ax = plt.subplots(figsize=(7,4)); imp.head(8)[::-1].plot.barh(ax=ax,color="#386641"); ax.set_title("Random-forest feature importance (nightly price)"); plt.tight_layout(); plt.savefig(OUT/"fig3_importance.png",dpi=130); plt.close()

# listing-level "value for money": actual vs predicted price (undervalued = good deal for travellers)
L["pred"] = np.exp(rf.predict(X)); L["value_gap_pct"] = (L.pred/L.price_night-1)*100
good = L[(L.rating>=4.7)&(L.n_reviews>=20)].nlargest(1,"value_gap_pct"); R["deal_example"] = good[["city","room_type","price_night","pred","rating"]].round(1).to_dict("records")

# destination clustering
mc = q("SELECT dest_id, AVG(avg_temp_c) temp, AVG(occupancy_pct) occ FROM monthly_climate WHERE month IN (6,7,8,9) GROUP BY dest_id")
D = L.groupby("dest_id").agg(city=("city","first"),night=("price_night","median"),rating=("rating","mean")).join(
    F.groupby("dest_id").price_eur.median().rename("flight")).join(mc.set_index("dest_id"))
D["trip5"] = D.flight*1 + 5*D.night
D = D[D.city!='Bali'].copy()   # long-haul outlier analysed separately
Z = StandardScaler().fit_transform(D[["night","flight","temp","occ","rating"]])
sil = {k:silhouette_score(Z,KMeans(k,n_init=20,random_state=0).fit_predict(Z)) for k in range(3,7)}; k = max(sil,key=sil.get)
D["cluster"] = KMeans(k,n_init=20,random_state=0).fit_predict(Z); R["kmeans_k"] = int(k); R["silhouette"] = {int(a):round(b,3) for a,b in sil.items()}
prof = D.groupby("cluster")[["night","flight","temp","occ","rating","trip5"]].mean().round(1); R["cluster_profiles"] = prof.to_dict("index")
R["cluster_members"] = {int(c):list(g.city) for c,g in D.groupby("cluster")}
fig,ax = plt.subplots(figsize=(8,6)); sc = ax.scatter(D.night,D.flight,c=D.cluster,s=D.temp*10,cmap="Set2",edgecolor="k")
for _,r in D.iterrows(): ax.annotate(r.city,(r.night,r.flight),fontsize=8,xytext=(4,3),textcoords="offset points")
ax.set_xlabel("Median nightly price (EUR)"); ax.set_ylabel("Median fare (EUR)"); ax.set_title("Destination segments (k-means; bubble = summer temp)")
plt.tight_layout(); plt.savefig(OUT/"fig4_clusters.png",dpi=130); plt.close()

# review text mining: TF-IDF + NMF topics
Rv = q("SELECT stars, comment FROM review"); tf = TfidfVectorizer(ngram_range=(2,3),stop_words="english",min_df=20); T = tf.fit_transform(Rv.comment)
nmf = NMF(2,random_state=0).fit(T); terms = np.array(tf.get_feature_names_out())
R["review_topics"] = {f"topic{i}":list(terms[c.argsort()[-5:][::-1]]) for i,c in enumerate(nmf.components_)}
neg = Rv[Rv.stars<=2].comment.str.split(" and ").explode().value_counts().head(4); R["top_complaints"] = neg.to_dict()
R["stars_vs_price_corr"] = float(L[["rating","price_night"]].dropna().corr(method="spearman").iloc[0,1])

# ---------- 5. DECISION TOOL: budget-aware planner ----------
tc = q("SELECT * FROM v_trip_cost")
def plan(budget, month, nights=5, min_temp=18, top=5):
    c = tc[(tc.month==month)&(tc.avg_temp_c>=min_temp)&(tc.avg_temp_c<=34)].copy()
    c["trip_cost"] = c.avg_flight + nights*c.avg_night; c = c[c.trip_cost<=budget]
    c["score"] = -abs(c.avg_temp_c-26)/10 - c.trip_cost/budget - c.occupancy_pct/200 - c.rainfall_mm/400
    return c.sort_values("score",ascending=False).head(top)[["city","trip_cost","avg_temp_c","rainfall_mm","occupancy_pct"]].round(0)
R["planner_demo_june_600"] = plan(600,6).to_dict("records")
R["planner_demo_oct_500"] = plan(500,10,min_temp=16).to_dict("records")
# shoulder-season saving for Mediterranean cities
med = tc[tc.city.isin(["Lisbon","Barcelona","Rome","Athens","Malaga","Dubrovnik"])]
jul = med[med.month==7].trip_cost_5n.mean(); sep = med[med.month==9].trip_cost_5n.mean()
R["shoulder_saving"] = dict(july=round(jul,0), september=round(sep,0), saving_pct=round((1-sep/jul)*100,1),
    sep_temp=round(med[med.month==9].avg_temp_c.mean(),1), jul_temp=round(med[med.month==7].avg_temp_c.mean(),1),
    sep_occ=round(med[med.month==9].occupancy_pct.mean(),1), jul_occ=round(med[med.month==7].occupancy_pct.mean(),1))
pm = tc.groupby("month").trip_cost_5n.mean(); fig,ax = plt.subplots(figsize=(7,4)); pm.plot(marker="o",ax=ax,color="#7b2cbf"); ax.set_xlabel("Month"); ax.set_ylabel("Avg 5-night trip cost (EUR)"); ax.set_title("Seasonality of total holiday cost"); plt.tight_layout(); plt.savefig(OUT/"fig5_seasonality.png",dpi=130); plt.close()
D.to_csv(OUT/"destination_segments.csv"); json.dump(R,open(OUT/"results.json","w"),indent=1,default=float); print(json.dumps(R,indent=1,default=float))
