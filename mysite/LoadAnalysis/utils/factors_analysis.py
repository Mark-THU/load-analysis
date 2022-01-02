# _*_ coding:utf-8 _*_
"""
create on: 2020-10-26
author: mark
@function:
影响因素分析，特征包括：日类型，季节类型，经济因素，天气因素，天气因素最值，历史天气因素，历史负荷
特征与与负荷之间相关性，
特征曲线与负荷变化曲线对比分析，
特征与日负荷特性指标之间相关性，
特征与日负荷特征指标之间因果关系，
"""
import pandas as pd
import json

from sqlalchemy import create_engine
from LoadAnalysis.utils.refine_analysis import GRA
from statsmodels.tsa.stattools import grangercausalitytests


def factors_analysis_method(district_id, time_start, time_end):
    """
    影响因素分析
    :param district_id: 电网id
    :return:
    特征与负荷之间相关系数，
    相关性较高的特征与负荷值，以绘制对比曲线，
    日特征与日负荷特性指标之间相关性，
    日特征与日负荷特性指标之间因果关系，
    """
    # 从数据库读取数据
    engine = create_engine('mysql+pymysql://root:fit4-305@localhost:3306/webdata')
    sql = "select * from integrate_{} where time between '{}' and '{}'".format(district_id, time_start, time_end)
    data = pd.read_sql_query(sql, con=engine)
    return_dict = {}
    # 计算相关系数
    data_corr = data.drop(columns='time')
    corr_pearson = abs(data_corr.corr()['load'].drop('load')).fillna(0)
    corr_spearman = abs(data_corr.corr('spearman')['load'].drop('load')).fillna(0)
    corr_gra = gra_by_one(data_corr, 'load').drop('load').fillna(0)

    variable_names = ['GDP', 'GDP增长率', '二产增加值', '三产增加值', '二产增长率', '三产增长率', '人均GDP', '城镇化率',
                      '天气', '温度', '湿度', '风类', '风向', '风级', '体感温度', '日类型', '季节类型', '日最高温度',
                      '日平均温度', '日最低温度', '日最高湿度', '日平均湿度', '日最低湿度', '日最高风级', '日平均风级',
                      '日最低风级', '日最高体感温度', '日平均体感温度', '日最低体感温度']
    return_dict['corr'] = {
        'variable_names': variable_names,
        'corr_pearson': corr_pearson.values.tolist(),
        'corr_spearman': corr_spearman.values.tolist(),
        'corr_gra': corr_gra.values.tolist()
    }
    # 返回温度，湿度，风级，体感温度以及负荷值
    # 按日平均
    sql = "select * from integrate_{}_chara where time between '{}' and '{}'".format(district_id, time_start, time_end)
    data_comp = pd.read_sql_query(sql, con=engine)

    datetime = data_comp.time.map(lambda x: x.strftime('%Y-%m-%d'))
    feature = data_comp.loc[:, 'maxTem':'minTembody']
    return_dict['comp'] = {
        'datetime': datetime.values.tolist(),
        'feature': feature.values.T.tolist(),
        'load': data_comp.meanLoad.values.tolist(),
    }
    # 计算特征与日负荷特性之间相关系数
    chara_load_corr_pearson = data_comp.drop(columns='time').corr().loc[:'minTembody', 'maxLoad':]
    chara_load_corr_spearman = data_comp.drop(columns='time').corr('spearman').loc[:'minTembody', 'maxLoad':]
    chara_load_corr_gra = GRA(data_comp.drop(columns='time')).loc[:'minTembody', 'maxLoad':]
    return_dict['chara_load_corr'] = {
        'chara_load_corr_pearson': chara_load_corr_pearson.values.tolist(),
        'chara_load_corr_spearman': chara_load_corr_spearman.values.tolist(),
        'chara_load_corr_gra': chara_load_corr_gra.values.tolist(),
    }
    # 计算特征与日负荷特性之间的因果关系
    cause = cause_analysis(data_comp)
    return_dict['cause'] = cause.values.tolist()

    return return_dict


def add_weather_history_data(data):
    # 增加历史天气因素
    names = ['wea', 'tem', 'hum', 'win', 'dir', 'winclass', 'tembody']
    col_names = list()
    cols = list()
    climate_data = data[names]
    for i in range(1, 3):
        cols.append(climate_data.shift(i))
        col_names += [name + '(t-%d)' % i for name in names]
    ex_climate_data = pd.concat(cols, axis=1)
    ex_climate_data.columns = col_names
    return_data = pd.concat((data, ex_climate_data), axis=1)
    return_data.dropna(inplace=True)

    return return_data


def gra_by_one(df, column):
    """
    单个变量与其他变量的灰色关联程度计算

    Args:
        df: 输入dataframe
        column：标准要素对应列名
    """
    # 归一化
    scaler = lambda x: (x -x.min()) / (x.max() - x.min())
    df = df.apply(scaler, axis=0)
    comp_df = df.copy().drop(columns=column)
    delta_df = abs(comp_df.sub(df.loc[:, column], axis=0))
    max_ = delta_df.max().max()
    min_ = delta_df.min().min()

    result = (min_ + 0.5 * max_) / (delta_df + 0.5 * max_)
    result.loc[:, column] = 1

    return result.mean(axis=0)


def cause_analysis(character):
    """
    因果关系分析
    :param character: 特征矩阵
    :return:
    """
    threshold = 0.6
    character_ = character.drop(columns='time')
    pearson = character_.corr().loc[:'minTembody', 'maxLoad':]
    spearman = character_.corr('spearman').loc[:'minTembody', 'maxLoad':]
    gra = GRA(character_).loc[:'minTembody', 'maxLoad':]
    corr = (abs(pearson) > threshold) & (abs(spearman) > threshold) & (abs(gra) > threshold)
    cause = corr.copy()
    for index in cause.index:
        for column in cause.columns:
            if cause.loc[index, column]:
                gc_res = grangercausalitytests(character.loc[:, [column, index]], 2, verbose=False)
                if (gc_res[1][0]['ssr_ftest'][1] > 0.05) and (gc_res[2][0]['ssr_ftest'][1] > 0.05):
                    cause.loc[index, column] = False

    return cause.astype('float')


if __name__ == '__main__':
    factors_analysis_method('0101110000', '2020-01-01', '2020-03-31')
