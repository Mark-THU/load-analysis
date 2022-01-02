# _*_ coding: utf-8 _*_
"""
create on 2020-09-03
@author: mark
@function:
仅针对电力负荷内部分析
"""
import pymysql
import pandas as pd
import matplotlib.pyplot as plt
import json

from sqlalchemy import create_engine
from LoadAnalysis.utils.refine_analysis import GRA, cause_analysis


def inner_analysis_method(district_id, time):
    # 读取纯负荷数据
    engine = create_engine('mysql+pymysql://root:fit4-305@localhost:3306/webdata')
    sql = 'select * from load_{} where YEAR(time) = {}'.format(district_id, time)
    load = pd.read_sql_query(sql, con=engine)
    return_dict = {}

    # 返回纯负荷数据以绘制负荷曲线
    datetime = load.time.map(lambda x: x.strftime('%Y-%m-%d %H:%M'))
    return_dict['load_line'] = {
        'datetime': datetime.values.tolist(),
        'load': load.load.values.tolist(),
    }
    # 返回负荷分布数据
    dist = plt.hist(load.load, 500)
    numbers = dist[0]
    load_values = dist[1]
    return_dict['dist_line'] = {
        'times': numbers.tolist(),
        'load_value': load_values.tolist(),
    }
    # 负荷内部相关性
    load_with_history = add_history_data(load)
    inner_corr_pearson = load_with_history.corr().drop(index='load').load
    inner_corr_spearman = load_with_history.corr('spearman').drop(index='load').load
    inner_corr_gra = GRA(load_with_history.drop(columns='time')).drop(index='load').load
    return_dict['inner_corr'] = {
        'inner_corr_pearson': inner_corr_pearson.values.tolist(),
        'inner_corr_spearman': inner_corr_spearman.values.tolist(),
        'inner_corr_gra': inner_corr_gra.values.tolist(),
    }
    # 日特征指标
    sql = "select * from integrate_{}_chara where YEAR(time) = {}".format(district_id, time)
    data = pd.read_sql_query(sql, con=engine)
    day_chara = data.loc[:, 'maxLoad':]
    day_chara.insert(0, 'time', data.time)
    datetime = day_chara.time.map(lambda x: x.strftime('%Y-%m-%d'))
    return_dict['day_chara'] = {
        'datetime': datetime.values.tolist(),
        'values': day_chara.drop(columns='time').values.T.tolist(),
    }
    # 月特征指标
    month_chara = get_month_chara(day_chara)
    datetime = month_chara.time.map(lambda x: x.strftime('%Y-%m'))
    return_dict['month_chara'] = {
        'datetime': datetime.values.tolist(),
        'values': month_chara.drop(columns='time').values.T.tolist(),
    }
    # 日特征指标相关性与因果性
    day_chara_corr_pearson = day_chara.corr()
    day_chara_corr_spearman = day_chara.corr('spearman')
    day_chara_corr_gra = GRA(day_chara.drop(columns='time'))
    day_chara_cause = cause_analysis(day_chara)
    return_dict['day_chara_corr'] = {
        'pearson': day_chara_corr_pearson.values.tolist(),
        'spearman': day_chara_corr_spearman.values.tolist(),
        'gra': day_chara_corr_gra.values.tolist(),
        'cause': day_chara_cause.values.tolist(),
    }
    # 月特征指标相关性与因果性
    month_chara_corr_pearson = month_chara.corr()
    month_chara_corr_spearman = month_chara.corr('spearman')
    month_chara_corr_gra = GRA(month_chara.drop(columns='time'))
    month_chara_cause = cause_analysis(month_chara)
    return_dict['month_chara_corr'] = {
        'pearson': month_chara_corr_pearson.values.tolist(),
        'spearman': month_chara_corr_spearman.values.tolist(),
        'gra': month_chara_corr_gra.values.tolist(),
        'cause': month_chara_cause.values.tolist(),
    }
    return return_dict


def add_history_data(data):
    col_names = list()
    cols = list()
    load_data = data[['load']]
    for i in list([1, 2, 3, 4, 5, 6, 7, 8, 24, 48, 72, 96, 120, 144, 168]):
        cols.append(load_data.shift(i))
        col_names += ['load' + '(t-%d)' % i]
    ex_load_data = pd.concat(cols, axis=1)
    ex_load_data.columns = col_names
    load_with_hostory = pd.concat((data, ex_load_data), axis=1)
    load_with_hostory.dropna(inplace=True, axis=0)
    return load_with_hostory


def get_month_chara(character_daily):
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
    character_groupby_month = character_daily.groupby([pd.Grouper(key='time', freq='M')])

    def get_month_chara_(group):
        df = pd.Series(dtype='float')
        df['max_'] = group['maxLoad'].max()
        df['av'] = group['meanLoad'].mean()
        df['max_delta'] = group['deltaLoad'].max()
        df['av_ratio'] = group['ratioLoad'].mean()
        df['min_ratio'] = group['minRatioLoad'].min()
        df['max_delta_ratio'] = group['deltaRatioLoad'].max()
        df['ratio'] = df.av / df.max_
        df['max_delta_ratio_load'] = group.loc[group['deltaRatioLoad'] == df.max_delta_ratio, 'maxLoad'].values[0]
        df.drop(columns=0, inplace=True)
        return df

    character_monthly = character_groupby_month.apply(get_month_chara_).reset_index()
    return character_monthly


def get_year_chara(character_monthly):
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
    character_groupby_year = character_monthly.groupby([pd.Grouper(key='time', freq='Y')])

    def get_year_chara_(group):
        df = pd.Series(dtype='float')
        df['max_'] = group.max_.max()
        df['unbalance'] = group.max_.mean() / df.max_
        df['max_delta'] = group.max_delta.max()
        df['max_delta_ratio'] = group.max_delta_ratio.max()
        df.drop(columns=0, inplace=True)
        return df

    character_yearly = character_groupby_year.apply(get_year_chara_).reset_index()
    return character_yearly


if __name__ == '__main__':
    inner_analysis_method('0101110000', '2020')
