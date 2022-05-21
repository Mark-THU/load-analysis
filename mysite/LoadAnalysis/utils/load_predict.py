# _*_ coding:utf-8 _*_
"""
create on: 2020-10-26
author: mark
@function:
负荷时间序列预测，前馈神经网络(FNN)，栈式自编码网络(SAE-NN)，支持向量机(SVR)，XGBoot
多变量，加入气象因素和经济因素
"""

import torch
import torch.nn as nn
import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt

from torch.utils.data import Dataset
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.svm import SVR
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import r2_score
from sqlalchemy import create_engine
from xgboost import XGBRegressor


def load_predict(district_id, time):
    # 读取数据
    engine = create_engine('mysql+pymysql://root:fit4-305@localhost:3306/webdata')
    data = pd.read_sql_table(table_name='integrate_' + district_id, con=engine)
    return_dict = {}
    # 将时间序列数据变为监督学习数据
    supervise_data = series_to_supervise(data)
    # 划分训练数据与标签
    # 归一化
    X = supervise_data.drop(columns=['time', 'load']).values
    scalerX = MinMaxScaler()
    X = scalerX.fit_transform(X)
    Y = supervise_data[['load']].values
    scalerY = MinMaxScaler()
    Y = scalerY.fit_transform(Y)
    # 划分训练集与测试集
    # trainX, testX, trainY, testY = train_test_split(X, Y, test_size=0.3)
    trainX = X
    trainY = Y
    train_dataset = MyDataset(torch.FloatTensor(trainX), torch.FloatTensor(trainY))

    # 使用2020年数据进行验证
    start_time = time + '-01'
    end_time = time + '-31'
    test_data = supervise_data[
        (supervise_data.time.astype('str') >= start_time) & (supervise_data.time.astype('str') <= end_time)]
    testX = test_data.drop(columns=['time', 'load']).values
    testX = scalerX.transform(testX)
    testY = test_data[['load']].values
    testY = scalerY.transform(testY)
    test_dataset = MyDataset(torch.FloatTensor(testX), torch.FloatTensor(testY))

    # 固定参数
    datetime = test_data.time.map(lambda x: x.strftime('%Y-%m-%d %H:%M'))
    load_true = test_data[['load']].values

    # 判断是否已经有FNN模型
    prefix = './mysite/LoadAnalysis/utils/models/'
    # prefix = './models/'
    # model_fnn_dir = './LoadAnalysis/utils/models/fnn_' + district_id + '.pkl'
    model_fnn_dir = prefix + 'fnn_' + district_id + '.pkl'
    model_fnn = FNN()
    try:
        model_fnn.load_state_dict(torch.load(model_fnn_dir))
    except:
        # 训练模型
        model_fnn = train_fnn(train_dataset)
        torch.save(model_fnn.state_dict(), model_fnn_dir)
    # 使用模型获取预测值
    y_pred_fnn = predict_fnn(model_fnn, test_dataset)
    load_pred_fnn = scalerY.inverse_transform(y_pred_fnn)
    # 模型评价
    RMSE, MAE, R2, ACC = evaluate(load_pred_fnn, load_true)

    return_dict['FNN'] = {
        'RMSE': RMSE.tolist(),
        'MAE': MAE.tolist(),
        'R2': R2.tolist(),
        'ACC': ACC.tolist(),
        'pred': load_pred_fnn.squeeze().tolist(),
    }
    # 判断是否已经有SAE-NN模型
    model_sae_dir = prefix + 'sae_' + district_id + '.pkl'
    model_saeLr_dir = prefix + 'saeLr_' + district_id + '.pkl'
    model_sae = AutoEncoder()
    model_saeLr = LR()
    try:
        model_sae.load_state_dict(torch.load(model_sae_dir))
        model_saeLr.load_state_dict(torch.load(model_saeLr_dir))
    except:
        # 训练模型
        model_sae, model_saeLr = train_sae(train_dataset)
        torch.save(model_sae.state_dict(), model_sae_dir)
        torch.save(model_saeLr.state_dict(), model_saeLr_dir)
    # 使用模型获取预测值
    y_pred_sae = predict_sae(model_sae, model_saeLr, test_dataset)
    load_pred_sae = scalerY.inverse_transform(y_pred_sae)
    # 模型评价
    RMSE, MAE, R2, ACC = evaluate(load_pred_sae, load_true)

    return_dict['SAE_NN'] = {
        'RMSE': RMSE.tolist(),
        'MAE': MAE.tolist(),
        'R2': R2.tolist(),
        'ACC': ACC.tolist(),
        'pred': load_pred_sae.squeeze().tolist(),
    }
    # 判断是否有SVR模型
    model_svr_dir = prefix + 'svr_' + district_id + '.pkl'
    try:
        model_svr = joblib.load(model_svr_dir)
    except:
        print('train a svr model')
        model_svr = train_svr(trainX, trainY.squeeze())
        joblib.dump(model_svr, model_svr_dir, compress=3)
        print('finish training a svr model')

    #  模型预测
    y_pred_svr = model_svr.predict(testX)
    y_pred_svr = np.expand_dims(y_pred_svr, axis=1)
    load_pred_svr = scalerY.inverse_transform(y_pred_svr)
    # 模型评价
    RMSE, MAE, R2, ACC = evaluate(load_pred_svr, load_true)

    return_dict['SVR'] = {
        'RMSE': RMSE.tolist(),
        'MAE': MAE.tolist(),
        'R2': R2.tolist(),
        'ACC': ACC.tolist(),
        'pred': load_pred_svr.squeeze().tolist(),
    }
    # 判断是否有XGBoost模型
    model_xgb_dir = prefix + 'xgb_' + district_id + '.pkl'
    try:
        model_xgb = joblib.load(model_xgb_dir)
    except:
        model_xgb = XGBRegressor()
        model_xgb.fit(trainX, trainY)
        joblib.dump(model_xgb, model_xgb_dir, compress=3)

    #  模型预测
    y_pred_xgb = model_xgb.predict(testX)
    y_pred_xgb = np.expand_dims(y_pred_xgb, axis=1)
    load_pred_xgb = scalerY.inverse_transform(y_pred_xgb)
    # 模型评价
    RMSE, MAE, R2, ACC = evaluate(load_pred_xgb, load_true)

    return_dict['XGBoost'] = {
        'RMSE': RMSE.tolist(),
        'MAE': MAE.tolist(),
        'R2': R2.tolist(),
        'ACC': ACC.tolist(),
        'pred': load_pred_xgb.squeeze().tolist(),
    }
    return_dict['true_data'] = {
        'datetime': datetime.values.tolist(),
        'true': load_true.squeeze().tolist(),
    }
    # plt.plot(load_pred_fnn, label='LSTM')
    # plt.plot(load_pred_svr, label='LSTM*')
    # plt.plot(load_true, label='True')
    # plt.legend(loc=2)
    # plt.xlabel('time series')
    # plt.ylabel('load')
    # plt.show()
    return return_dict


def series_to_supervise(data):
    """
    时间序列->监督学习
    :param data: 带特征的时间序列
    :return:
    不具有时间特征的数据
    """
    # append ex climate data
    names = ['wea', 'tem', 'hum', 'win', 'dir', 'winclass', 'tembody']
    col_names = list()
    cols = list()
    climate_data = data[names]
    for i in range(1, 3):
        cols.append(climate_data.shift(i))
        col_names += [name + '(t-%d)' % i for name in names]
    ex_climate_data = pd.concat(cols, axis=1)
    ex_climate_data.columns = col_names
    # append ex load data
    col_names = list()
    cols = list()
    load_data = data[['load']]
    for i in list([1, 2, 3, 4, 5, 6, 7, 8, 24, 48, 72, 96, 120, 144, 168]):
        cols.append(load_data.shift(i))
        col_names += ['load' + '(t-%d)' % i]
    ex_load_data = pd.concat(cols, axis=1)
    ex_load_data.columns = col_names
    supervise_data = pd.concat((data, ex_climate_data, ex_load_data), axis=1)
    supervise_data.dropna(inplace=True)

    return supervise_data


def train_fnn(train_dataset, num_epoch=40, batch_size=1024, lr=1e-3):
    """
    训练模型
    :param train_dataset: 训练集
    :param num_epoch: 迭代次数
    :param batch_size:
    :param lr: 学习率
    :return: 模型参数
    """
    model_fnn = FNN()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model_fnn.parameters(), lr=lr)
    train_hist = list()
    train_loader = torch.utils.data.DataLoader(dataset=train_dataset, batch_size=batch_size, shuffle=False,
                                               drop_last=False)
    for epoch in range(num_epoch):
        for i, (data, labels) in enumerate(train_loader):
            y = model_fnn(data)
            loss = criterion(y, labels)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            if (i) % 3 == 0:
                print('Epoch [{}/{}], Step [{}/{}], Loss: {}'.format(
                    epoch + 1, num_epoch, i + 1, len(train_dataset) // batch_size, loss.data.item()))
            train_hist.append(loss.data.item())
    # plt.plot(train_hist)
    # plt.show()
    return model_fnn


def train_sae(train_dataset, num_epoch=40, batch_size=1024, lr=1e-3):
    """
    训练栈式自编码网络
    :param train_dataset: 训练数据
    :param num_epoch: 迭代次数
    :param batch_size:
    :param lr: 学习率
    :return:
    model_sae, model_saeLr
    """
    # 训练自编码网络
    model_sae = AutoEncoder()
    criterion_1 = nn.MSELoss()
    optimizer_1 = torch.optim.Adam(model_sae.parameters(), lr=lr)
    train_loader = torch.utils.data.DataLoader(dataset=train_dataset, batch_size=batch_size, shuffle=False,
                                               drop_last=False)
    # train_hist_1 = list()
    for epoch in range(num_epoch):
        for i, (data, labels) in enumerate(train_loader):
            # pdb.set_trace()
            data_reconstruct = model_sae(data)
            loss = criterion_1(data_reconstruct, data)
            optimizer_1.zero_grad()
            loss.backward()
            optimizer_1.step()
            if (i) % 3 == 0:
                print('Epoch [{}/{}], Step [{}/{}], Loss: {}'.format(
                    epoch + 1, num_epoch, i + 1, len(train_dataset) // batch_size, loss.data.item()))
            # train_hist_1.append(loss.data.item())

    # plt.plot(train_hist_1)
    # 训练LR网络
    # 训练LR网络
    model_saeLr = LR()
    criterion_2 = nn.MSELoss()
    optimizer_2 = torch.optim.Adam(model_saeLr.parameters(), lr=lr)
    # train_hist_2 = list()
    for epoch in range(num_epoch):
        for i, (data, labels) in enumerate(train_loader):
            x_1 = model_sae.encode(data).detach()
            y = model_saeLr(x_1)
            loss = criterion_2(y, labels)
            optimizer_2.zero_grad()
            loss.backward()
            optimizer_2.step()
            if (i) % 3 == 0:
                print('Epoch [{}/{}], Step [{}/{}], Loss: {}'.format(
                    epoch + 1, num_epoch, i + 1, len(train_dataset) // batch_size, loss.data.item()))
            # train_hist_2.append(loss.data.item())

    # plt.plot(train_hist_2)
    # plt.show()

    return model_sae, model_saeLr


def train_svr(trainX, trainY):
    """
    训练SVR，使用gridsearch
    :param trainX:
    :param trainY:
    :return: 最好的模型
    """
    svr = SVR()
    param_grid = [{'kernel': ['rbf'], 'gamma': [1e-3, 1e-4], 'C': [1, 10, 100, 1000]},
                  {'kernel': ['linear'], 'C': [1, 10, 100, 1000]}]
    grid_search = GridSearchCV(svr, param_grid, cv=5)
    grid_search.fit(trainX, trainY)
    return grid_search.best_estimator_


def predict_fnn(model_fnn, test_dataset, batch_size=1024):
    test_loader = torch.utils.data.DataLoader(dataset=test_dataset, batch_size=batch_size, shuffle=False,
                                              drop_last=False)
    y_pred = None
    # y_true = None
    with torch.no_grad():
        for data, labels in test_loader:
            outputs = model_fnn(data)
            if y_pred is None:
                y_pred = outputs.numpy()
                # y_true = labels.numpy()
            else:
                y_pred = np.concatenate((y_pred, outputs.numpy()), axis=0)
                # y_true = np.concatenate((y_true, labels.numpy()), axis=0)
    return y_pred


def predict_sae(model_sae, model_saeLr, test_dataset, batch_size=1024):
    """
    使用SAE-NN网络进行预测
    :param model_sae: 自编码网络
    :param model_saeLr: LR网络
    :param test_dataset: 测试集
    :param batch_size:
    :return: 预测值
    """
    test_loader = torch.utils.data.DataLoader(dataset=test_dataset, batch_size=batch_size, shuffle=False,
                                              drop_last=False)
    y_pred = None
    with torch.no_grad():
        for data, labels in test_loader:
            x_1 = model_sae.encode(data)
            outputs = model_saeLr(x_1)
            if y_pred is None:
                y_pred = outputs.numpy()
            else:
                y_pred = np.concatenate((y_pred, outputs.numpy()), axis=0)
    return y_pred


def evaluate(y_pred, y_true):
    """
    评价预测准确性
    :param y_pred: 预测值
    :param y_true: 真实值
    :return:
    """
    RMSE = np.sqrt(np.mean(np.power(y_pred - y_true, 2)))
    MAE = np.mean(np.abs(y_pred - y_true))
    R2 = r2_score(y_pred, y_true)
    ACC = 1 - np.sqrt(np.mean(np.power((y_pred - y_true) / y_true, 2)))
    return RMSE, MAE, R2, ACC


class MyDataset(Dataset):
    # 自定义数据集
    def __init__(self, data, labels):
        self.data = data
        self.labels = labels

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx], self.labels[idx]


class FNN(nn.Module):
    """
    定义FNN网络 58->20->1
    A fnn neural network
    """

    def __init__(self):
        super(FNN, self).__init__()

        self.fnn = nn.Sequential(
            nn.Linear(58, 20),
            nn.ReLU(),
            nn.Linear(20, 1),
            nn.ReLU(),
        )

    def forward(self, x):
        return self.fnn(x)


class AutoEncoder(nn.Module):
    """
    autoencoder for stacked autoencoders.

    Args:
        input_size: The number of features in the input.
        output_size: The number of features in the output.
    """

    def __init__(self, input_size=58, output_size=20):
        super(AutoEncoder, self).__init__()

        self.forward_pass = nn.Sequential(
            nn.Linear(input_size, output_size),
            nn.ReLU(),
        )

        self.backward_pass = nn.Sequential(
            nn.Linear(output_size, input_size),
            nn.ReLU(),
        )

    def forward(self, x):
        x_noise = x + torch.randn(x.size()) * 0.1
        y = self.forward_pass(x_noise)
        x_reconstruct = self.backward_pass(y)
        return x_reconstruct

    def encode(self, x):
        return self.forward_pass(x)


class LR(nn.Module):
    """
    Linear Regression.
    Args:
        input_size: The number of features in the input.
        output_size: The number of features in the output.
    """

    def __init__(self, input_size=20, output_size=1):
        super(LR, self).__init__()

        self.fc = nn.Sequential(
            nn.Linear(input_size, output_size),
            nn.ReLU(),
        )

    def forward(self, x):
        return self.fc(x)


if __name__ == '__main__':
    district_ids = ['0101110000', '0101120000', '0101310000', '0101500000']
    # for district_id in district_ids:
    #     predict_fnn(district_id)
    load_predict(district_ids[1], '2020-08')
    load_predict(district_ids[2], '2020-08')
    load_predict(district_ids[3], '2020-08')
