# _*_ coding: utf-8 _*_
"""
create on 2020-11-20
@author: mark
@function:
仅针对电力负荷内部分析, 分析降温负荷与采暖负荷影响
"""
import pymysql
import pandas as pd
import matplotlib.pyplot as plt
import json
import numpy as np
import datetime

from sqlalchemy import create_engine


def cool_heat_load_analysis(district_id, time):
    # 读取数据
    sql = "select * from load_{} where YEAR(time) = {}".format(district_id, time)
    engine = create_engine('mysql+pymysql://root:fit4-305@localhost:3306/webdata')
    data = pd.read_sql_query(sql, con=engine, index_col='time')
    try:
        load_without_cool = get_max_load(data[time + '-04']).values.squeeze()
        load_with_cool = get_max_load(data[time + '-05':time + '-07']).values.squeeze()
        load_cool = load_with_cool - load_without_cool
        # 计算日特性指标
        load_without_cool_chara = get_day_chara(load_without_cool)
        load_with_cool_chara = get_day_chara(load_with_cool)
        load_cool_chara = get_day_chara(load_cool)
    except:
        load_without_cool, load_with_cool, load_cool = (np.array([]), np.array([]), np.array([]))
        load_without_cool_chara, load_with_cool_chara, load_cool_chara = ([], [], [])
    try:
        load_without_heat = get_max_load(data[time + '-10']).values.squeeze()
        load_with_heat = get_max_load(data[time + '-11':time + '-12']).values.squeeze()
        load_heat = load_with_heat - load_without_heat

        load_without_heat_chara = get_day_chara(load_without_heat)
        load_with_heat_chara = get_day_chara(load_with_heat)
        load_heat_chara = get_day_chara(load_heat)
    except:
        load_without_heat, load_with_heat, load_heat = (np.array([]), np.array([]), np.array([]))
        load_without_heat_chara, load_with_heat_chara, load_heat_chara = ([], [], [])

    return_dict = json.dumps({
        'load_without_cool': load_without_cool.tolist(),
        'load_with_cool': load_with_cool.tolist(),
        'load_cool': load_cool.tolist(),
        'load_without_heat': load_without_heat.tolist(),
        'load_with_heat': load_with_heat.tolist(),
        'load_heat': load_heat.tolist(),
        'load_without_cool_chara': load_without_cool_chara,
        'load_with_cool_chara': load_with_cool_chara,
        'load_cool_chara': load_cool_chara,
        'load_without_heat_chara': load_without_heat_chara,
        'load_with_heat_chara': load_with_heat_chara,
        'load_heat_chara': load_heat_chara,
    })
    return return_dict


def get_max_load(data):
    data_tmp = data.resample('D').apply(lambda x: x.max())
    index_max = data_tmp.loc[data_tmp.load == max(data_tmp.load)].index[0]
    index_str = datetime.datetime.strftime(index_max, '%Y-%m-%d')
    return data[index_str]


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
    load_max = max(load_daily)
    load_min = min(load_daily)
    load_mean = np.mean(load_daily)
    load_ratio = load_mean / load_max
    load_min_ratio = load_min / load_max
    load_delta = load_max - load_min
    load_delta_ratio = load_delta / load_max

    return [load_max, load_min, load_mean, load_ratio, load_min_ratio, load_delta, load_delta_ratio]


if __name__ == '__main__':
    cool_heat_load_analysis('0101120000', '2019')
