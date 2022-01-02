# _*_ coding: utf-8 _*_
"""
create on 2020-09-03
@author: mark
@function:
电力负荷聚类分析，按照日聚类和周聚类两种
@warnings:
聚类算法还可以改进
"""
import pymysql
import pandas as pd
from sqlalchemy import create_engine
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from statsmodels.tsa.stattools import grangercausalitytests
from chinese_calendar import is_workday


def improve_kmeans(X, max_k):
    """
    改进Kmeans聚类算法
    :param X: 数据
    :param max_k: 最大类别限制
    :return: 标签
    """
    best_score = 0
    best_label = None
    best_k = 0
    for k in range(2, max_k, 1):
        estimator = KMeans(n_clusters=k)
        estimator.fit(X)
        labels = estimator.labels_
        score = silhouette_score(X, labels)
        if score > best_score:
            best_score = score
            best_label = labels
            best_k = k
    return best_label, best_k


def refine_analysis_by_week(district_id, time):
    """
    根据district_id从数据库读取数据，然后返回周聚类分析结果
    :param district_id: 电网id
    :return
    load_average_norm, load_average, chara_average, corr_pearson, corr_spearman, corr_gra, cause
    """
    # 数据库导入数据
    engine = create_engine('mysql+pymysql://root:fit4-305@localhost:3306/webdata')
    sql = 'select * from load_{} where YEAR(time) = {}'.format(district_id, time)
    load = pd.read_sql_query(sql, con=engine)

    def divide_by_week(group):
        if group.count()[0] == 168:
            df_tmp = pd.DataFrame(group[['load']].values.T)
            return df_tmp
        else:
            pass
        return

    load_groupby_week = load.groupby([pd.Grouper(key='time', freq='w')])
    load_weekly = load_groupby_week.apply(divide_by_week).reset_index()
    load_weekly.dropna(axis=0, how='any', inplace=True)
    load_weekly.drop('level_1', axis=1, inplace=True)
    # 归一化，消除数值的影响
    load_weekly_normalize = load_weekly.copy()
    mean_scaler = lambda x: (x - min(x)) / (max(x) - min(x))
    load_weekly_normalize.iloc[:, 1:] = load_weekly.iloc[:, 1:].apply(mean_scaler, axis=1)
    load_weekly_normalize.dropna(axis=0, inplace=True)
    load_weekly = load_weekly.loc[load_weekly_normalize.index, :]

    # 使用改进K-means进行周聚类
    X = load_weekly_normalize.drop(columns='time').values
    labels_, k = improve_kmeans(X, 4)

    # 计算需要返回的数据
    load_average_norm = []
    load_average = []
    load_type = []
    chara_average = []
    corr_pearson = []
    corr_spearman = []
    corr_gra = []
    cause = []
    return_dict = {}
    for i in range(k):
        load_norm_tmp = load_weekly_normalize.loc[labels_ == i, :]
        load_norm_tmp_mean = load_norm_tmp.mean(axis=0, numeric_only=True).to_frame().T
        load_average_norm.append(load_norm_tmp_mean.values.squeeze().tolist())

        load_tmp = load_weekly.loc[labels_ == i, :]
        load_tmp_mean = load_tmp.drop(columns=['time']).mean(axis=0).to_frame().T
        load_average.append(load_tmp_mean.values.squeeze().tolist())

        load_type.append(load_tmp.time.map(lambda x: is_workday(x)).values.mean())

        chara_average.append(get_week_chara(load_tmp_mean).values.squeeze().tolist())

        chara_tmp = get_week_chara(load_tmp)
        corr_pearson.append(chara_tmp.corr().values.tolist())
        corr_spearman.append(chara_tmp.corr('spearman').values.tolist())
        corr_gra.append(GRA(chara_tmp.drop(columns='time')).values.tolist())

        cause.append(cause_analysis(chara_tmp).values.tolist())
    min_ = min(load_type)
    max_ = max(load_type)
    for i, item in enumerate(load_type):
        load_type[i] = (load_type[i] - min_) / (max_ - min_)

    return_dict['load_average_norm'] = load_average_norm
    return_dict['load_average'] = load_average
    return_dict['load_type'] = load_type
    return_dict['chara_average'] = chara_average
    return_dict['corr_pearson'] = corr_pearson
    return_dict['corr_spearman'] = corr_spearman
    return_dict['corr_gra'] = corr_gra
    return_dict['cause'] = cause
    return return_dict


def get_week_chara(load_weekly):
    """
    计算周负荷特性指标
    # 周最大负荷
    # 周平均负荷
    # 周最大日峰谷差
    # 周平均日负荷率
    # 周最小日负荷率
    # 周最大日峰谷差率
    # 周负荷率
    # 峰谷差最大日的最大用电负荷
    :param load_daily
    日负荷数据
    :return
    周负荷特性指标
    """

    def get_week_chara_(piece):
        values = piece.values
        load_daily = pd.DataFrame(values.reshape(7, -1))
        chara_daily = get_day_chara(load_daily)
        tmp = pd.Series([], dtype='float')
        tmp['max_'] = chara_daily['max'].max()
        tmp['av'] = chara_daily['mean'].mean()
        tmp['max_delta'] = chara_daily['delta'].max()
        tmp['av_ratio'] = chara_daily['ratio'].mean()
        tmp['min_ratio'] = chara_daily['min_ratio'].min()
        tmp['max_delta_ratio'] = chara_daily['delta_ratio'].max()
        tmp['ratio'] = tmp.av / tmp.max_
        tmp['max_delta_ratio_load'] = chara_daily.loc[
            chara_daily['delta_ratio'] == tmp.max_delta_ratio, 'max'].values[0]
        return tmp

    if 'time' in load_weekly.columns:
        character_weekly = load_weekly.drop(columns='time').apply(get_week_chara_, axis=1)
        character_weekly.insert(0, 'time', load_weekly.time)
        return character_weekly
    else:
        character_weekly = load_weekly.apply(get_week_chara_, axis=1)
        return character_weekly


def refine_analysis_by_day(district_id, time):
    """
    根据district_id从数据库读取数据，然后返回日聚类分析结果
    :param district_id: 电网id
    :return
    各类别的平均负荷归一化后值，未归一化的值
    {’load_average_1‘:pd.dataframe,'load_average_2':pd.dataframe,}
    各类别的平均负荷特性指标
    {’chara_1':pd.dataframe,'chara_2':pd.dataframe}
    相关性分析结果
    {pd.dataframe}
    因果性分析结果
    {pd.dataframe}
    """
    # 从数据库读取数据，导入到DataFrame中
    engine = create_engine('mysql+pymysql://root:fit4-305@localhost:3306/webdata')
    sql = 'select * from load_{} where YEAR(time) = {}'.format(district_id, time)
    load = pd.read_sql_query(sql, con=engine)

    def divide_by_day(group):
        """
        每日负荷数据作为矩阵的一行
        :param group:
        :return:
        """
        if group.shape[0] == 24:
            df_tmp = pd.DataFrame(group[['load']].values.T)
            return df_tmp
        else:
            pass
        return

    # 数据按天格式化
    load_groupby_day = load.groupby([pd.Grouper(key='time', freq='D')])
    load_daily = load_groupby_day.apply(divide_by_day).reset_index()
    load_daily.dropna(axis=0, how='any', inplace=True)
    load_daily.drop('level_1', axis=1, inplace=True)
    # 归一化，消除数值的影响
    load_daily_normalize = load_daily.copy()
    mean_scaler = lambda x: (x - min(x)) / (max(x) - min(x))
    load_daily_normalize.iloc[:, 1:] = load_daily.iloc[:, 1:].apply(mean_scaler, axis=1)
    load_daily_normalize.dropna(axis=0, inplace=True)
    load_daily = load_daily.loc[load_daily_normalize.index, :]

    # 使用改进K-means进行日聚类
    X = load_daily_normalize.drop(columns='time').values
    labels_, k = improve_kmeans(X, 3)

    # 计算需要返回的数据
    load_average_norm = []
    load_average = []
    load_type = []
    chara_average = []
    corr_pearson = []
    corr_spearman = []
    corr_gra = []
    cause = []
    return_dict = {}
    for i in range(k):
        load_norm_tmp = load_daily_normalize.loc[labels_ == i, :]
        load_norm_tmp_mean = load_norm_tmp.mean(axis=0, numeric_only=True).to_frame().T
        load_average_norm.append(load_norm_tmp_mean.values.squeeze().tolist())

        load_tmp = load_daily.loc[labels_ == i, :]
        load_tmp_mean = load_tmp.drop(columns=['time']).mean(axis=0).to_frame().T
        load_average.append(load_tmp_mean.values.squeeze().tolist())

        load_type.append(load_tmp.time.map(lambda x: is_workday(x)).values.mean())

        chara_average.append(get_day_chara(load_tmp_mean).values.squeeze().tolist())

        chara_tmp = get_day_chara(load_tmp)
        corr_pearson.append(chara_tmp.corr().values.tolist())
        corr_spearman.append(chara_tmp.corr('spearman').values.tolist())
        corr_gra.append(GRA(chara_tmp.drop(columns='time')).values.tolist())

        cause.append(cause_analysis(chara_tmp).values.tolist())
    min_ = min(load_type)
    max_ = max(load_type)
    for i, item in enumerate(load_type):
        load_type[i] = (load_type[i] - min_) / (max_ - min_)

    return_dict['load_average_norm'] = load_average_norm
    return_dict['load_average'] = load_average
    return_dict['load_type'] = load_type
    return_dict['chara_average'] = chara_average
    return_dict['corr_pearson'] = corr_pearson
    return_dict['corr_spearman'] = corr_spearman
    return_dict['corr_gra'] = corr_gra
    return_dict['cause'] = cause
    return return_dict


def get_day_chara(load_daily):
    """
    计算日负荷特性指标并添加到数据中:
    日最大负荷
    日最小负荷
    日平均负荷
    日负荷率=日平均负荷/日最大负荷
    日最小负荷率=日最小负荷/日最大负荷
    日峰谷差=日最大负荷-日最小负荷
    日峰谷差率=（日最大负荷-日最小负荷）/日最大负荷
    :param load_daily: 日负荷数据
    :return: 日负荷特性指标
    """
    load_max = load_daily.max(axis=1, numeric_only=True)
    load_min = load_daily.min(axis=1, numeric_only=True)
    load_mean = load_daily.mean(axis=1, numeric_only=True)
    load_ratio = load_mean / load_max
    load_min_ratio = load_min / load_max
    load_delta = load_max - load_min
    load_delta_ratio = load_delta / load_max
    character_daily = pd.concat(
        (load_max, load_min, load_mean, load_ratio, load_min_ratio, load_delta, load_delta_ratio), axis=1)
    character_daily.columns = ['max', 'min', 'mean', 'ratio', 'min_ratio', 'delta', 'delta_ratio']
    if 'time' in load_daily.columns:
        character_daily.insert(0, 'time', load_daily.time)
    return character_daily


def get_month_chara(load_daily):
    """
    计算月负荷特性指标:
    # 月最大负荷
    # 月平均负荷
    # 月最大日峰谷差
    # 月平均日负荷率
    # 月最小日负荷率
    # 月最大日峰谷差率
    # 月负荷率
    # 峰谷差最大日的最大用点负荷
        # 累计最大负荷利用小时数
    :param load_daily: 日负荷数据
    :return:
    """
    character_daily = get_day_chara(load_daily)
    character_groupby_month = character_daily.groupby([pd.Grouper(key='time', freq='M')])

    def get_month_chara_(group):
        df = pd.DataFrame([0])
        df['max_'] = group['max'].max()
        df['av'] = group['mean'].mean()
        df['max_delta'] = group['delta'].max()
        df['av_ratio'] = group['ratio'].mean()
        df['min_ratio'] = group['min_ratio'].min()
        df['max_delta_ratio'] = group['delta_ratio'].max()
        df['ratio'] = df.av.values / df.max_.values
        df['max_delta_ratio_load'] = group.loc[group['delta_ratio'] == df.max_delta_ratio[0], 'max'].values
        df.drop(columns=0, inplace=True)
        return df

    character_monthly = character_groupby_month.apply(get_month_chara_).reset_index()
    character_monthly.drop(columns='level_1', inplace=True)
    return character_monthly


def get_year_chara(load_daily):
    """
    计算年负荷特征指标
    # 年最大负荷
    # 季不均衡系数
    # 年最大峰谷差
    # 年最大峰谷差率
    # 年最大负荷利用小时数
    # 年负荷曲线
    # 年持续负荷曲线
    :param load_daily:
    :return:
    """
    character_monthly = get_month_chara(load_daily)
    character_groupby_year = character_monthly.groupby([pd.Grouper(key='time', freq='Y')])

    def get_year_chara_(group):
        df = pd.DataFrame([0])
        df['max_'] = group.max_.max()
        df['unbalance'] = group.max_.mean() / df.max_
        df['max_delta'] = group.max_delta.max()
        df['max_delta_ratio'] = group.max_delta_ratio.max()
        df.drop(columns=0, inplace=True)
        return df

    character_yearly = character_groupby_year.apply(get_year_chara_).reset_index()
    character_yearly.drop(columns='level_1', inplace=True)
    return character_yearly


def GRA(df):
    """
    灰色关联计算相关性
    :param df: 输入矩阵
    :return: 相关性矩阵
    """
    scaler = lambda x: (x - x.min()) / (x.max() - x.min())
    # scaler = lambda x: x / x.mean()
    df = df.apply(scaler, axis=0)
    result = pd.DataFrame(index=df.columns, columns=df.columns)

    def GRAByOne(df, column):
        """
        单个变量与其他变量的灰色关联程度计算

        Args:
            df: 输入dataframe
            index：标准要素对应列名
        """
        comp_df = df.copy().drop(columns=column)
        delta_df = abs(comp_df.sub(df.loc[:, column], axis=0))
        max_ = delta_df.max().max()
        min_ = delta_df.min().min()

        result_ = (min_ + 0.5 * max_) / (delta_df + 0.5 * max_)
        result_.loc[:, column] = 1

        return result_.mean(axis=0)

    for column in df.columns:
        result.loc[column, :] = GRAByOne(df, column)
    return result


def cause_analysis(character):
    """
    因果关系分析
    :param character: 特征矩阵
    :return:
    """
    character_ = character.drop(columns='time')
    pearson = character_.corr()
    spearman = character_.corr('spearman')
    gra = GRA(character_)
    corr = (abs(pearson) > 0.7) & (abs(spearman) > 0.7) & (abs(gra) > 0.7)
    cause = corr.copy()
    for index in cause.index:
        for column in cause.columns:
            if cause.loc[index, column]:
                try:
                    gc_res = grangercausalitytests(character.loc[:, [index, column]], 2, verbose=False)
                    if (gc_res[1][0]['ssr_ftest'][1] > 0.05) and (gc_res[2][0]['ssr_ftest'][1] > 0.05):
                        cause.loc[index, column] = False
                except:
                    cause.loc[index, column] = False

    return cause.astype('float')


if __name__ == '__main__':
    refine_analysis_by_day('0101110000', '2018')
