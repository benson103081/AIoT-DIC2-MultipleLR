"""Independent 50-digit Decimal normal-equation oracle; no third-party packages.
Production uses QR, oracle uses pivoted Gaussian elimination on X'X.
"""
import csv, json
from decimal import Decimal as D, getcontext
from pathlib import Path
getcontext().prec = 50

def solve(a, b):
    a = [r[:] + [v] for r, v in zip(a, b)]
    n = len(b)
    for j in range(n):
        pivot = max(range(j, n), key=lambda i: abs(a[i][j]))
        a[j], a[pivot] = a[pivot], a[j]
        den = a[j][j]
        assert den != 0
        a[j] = [v / den for v in a[j]]
        for i in range(n):
            if i != j:
                f = a[i][j]
                a[i] = [v - f * w for v, w in zip(a[i], a[j])]
    return [r[-1] for r in a]

evidence = []
for name, file in [('startups','50_Startups.csv'),('mtcars','mtcars.csv')]:
    report = json.loads(Path(f'reports/{name}.json').read_text(encoding='utf-8'))
    rows = list(csv.DictReader(Path(f'data/{file}').open(encoding='utf-8')))
    for result in report['results']:
        model = result['model']
        if model['regular']:
            continue
        def encode(row):
            return [D(1)] + [D(row[c['source']]) if c['type']=='number' else D(int(row[c['source']]==c['level'])) for c in model['prep']['columns']]
        X = [encode(rows[i-2]) for i in report['trainIDs']]
        y = [D(rows[i-2][report['target']]) for i in report['trainIDs']]
        p = len(X[0])
        A = [[sum(r[j]*r[k] for r in X) for k in range(p)] for j in range(p)]
        b = [sum(r[j]*v for r,v in zip(X,y)) for j in range(p)]
        beta = solve(A,b)
        actual = [model['intercept']] + model['coef']
        delta = max(abs(float(v)-w) for v,w in zip(beta,actual))
        assert delta < 1e-6, (name,result['method'],delta)
        test = [rows[i-2] for i in report['testIDs']]
        err = [D(r[report['target']])-sum(v*b for v,b in zip(encode(r),beta)) for r in test]
        rmse = float((sum(e*e for e in err)/D(len(err))).sqrt())
        mae = float(sum(abs(e) for e in err)/D(len(err)))
        assert abs(rmse-result['test']['rmse']) < 1e-6
        assert abs(mae-result['test']['mae']) < 1e-6
        evidence.append({'problem':name,'method':result['method'],'k':result['k'],'max_coefficient_error':delta,'rmse_error':abs(rmse-result['test']['rmse'])})
Path('reports/numeric-verification.json').write_text(json.dumps({'oracle':'Python Decimal precision=50; independent pivoted normal-equation solution','tolerance':1e-6,'passed':True,'cases':evidence},indent=2)+'\n')
print(f'PASS: {len(evidence)} OLS models verified against independent 50-digit Decimal oracle; coefficient, RMSE, MAE error < 1e-6')
