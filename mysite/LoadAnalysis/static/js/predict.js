const modelNames = ['FNN', 'SVR', 'XGBoost'];
const modelNamesTrue = ['FNN', 'SVR', 'XGBoost']
const metrics = ['RMSE', 'MAE', 'R2', 'ACC'];
var metric_data;
var predict_data;
$(document).ready(function () {
    // 表格初始显示
    drawMetricTable();
    drawDataTable();
    //设置电网option
    districtOptionSet();
    // 根据电网设置可选择日期
    $('#district-select').change(function () {
        dateSet();
    });
    // 分析按钮被点击
    $("#analysis-button").click(function () {
        let year = $('#datepicker-year').val();
        let district_id = $('#district-select').val();
        if (year.length === 0) {
            alert('请选择月份');
        } else {
            // 设置画布点击后显示正在加载
            $('.myEcharts').each(function () {
                let id = $(this).attr('id');
                let myChart = echarts.init(document.getElementById(id));
                myChart.showLoading({
                    text: '正在加载数据···',
                    color: '#007d7b',
                    textColor: '#000',
                    maskColor: 'rgba(255, 255, 255, 0.2)',
                    zlevel: 0,
                });
            });
            $('.myTables').each(function () {
                $(this).bootstrapTable('showLoading');
            })
            $.ajax({
                url: "/predict/" + district_id,
                type: 'GET',
                data: {'time': year},
                dateType: "json",
                success: function (result) {
                    all_data = JSON.parse(result);
                    metric_data = [];
                    predict_data = [];
                    for (let i = 0; i < all_data['true_data'].datetime.length; i++) {
                        predict_data.push({
                            'time': all_data['true_data'].datetime[i],
                            'FNN': all_data['FNN'].pred[i].toFixed(1),
                            'SVR': all_data['SVR'].pred[i].toFixed(1),
                            'XGBoost': all_data['XGBoost'].pred[i].toFixed(1),
                            'TRUE': all_data['true_data'].true[i].toFixed(1),
                        })
                    }
                    for (let i = 0; i < modelNames.length; i++) {
                        metric_data.push({
                            'model': modelNamesTrue[i],
                            'RMSE': all_data[modelNames[i]].RMSE.toFixed(2),
                            'MAE': all_data[modelNames[i]].MAE.toFixed(2),
                            'R2': all_data[modelNames[i]].R2.toFixed(2),
                            'ACC': all_data[modelNames[i]].ACC.toFixed(2),
                        })
                    }
                    // 绘制表格
                    loadMetricTable(metric_data);
                    // 绘制预测值与真实值比较图
                    drawPredTrueComp();
                    // 数据表格
                    loadDataTable(predict_data);
                }
            });
        }
    });
})

function districtOptionSet() {
    $.ajax({
        url: "/indexgetdata",
        type: 'GET',
        data: {'search_kw': 'integrate_'},
        dataType: "json",
        success: function (result) {
            let select = $("#district-select");
            select.empty();
            let option;
            for (let i = 0; i < result.length; i++) {
                option = $("<option></option>").text(result[i].district_name);
                option.attr('value', result[i].district_id);
                select.append(option);
            }
            dateSet(init = true);
        }
    });
}

function dateSet(init = false) {
    let district_id = $('#district-select').val();
    $.ajax({
        url: "/indexgetdata",
        type: 'GET',
        data: {'search_kw': 'integrate_', 'district_id': district_id},
        dataType: "json",
        success: function (result) {
            $('.J-yearMonthPicker-single').datePicker({
                format: 'YYYY-MM',
                language: 'zh',
                min: result[0].min_time,
                max: result[0].max_time,
            });
            $('#datepicker-year').val(result[0].max_time.slice(0, 7));
            if (init) {
                $('#analysis-button').click();
            }
        }
    })
}

function drawMetricTable() {
    let table = $('#table-metric');
    let height = $('#pred-true-comp').height();
    table.bootstrapTable('hideLoading');
    table.bootstrapTable({
        data: [],
        height: height,
        striped: true,
        cache: false,
        toolbar: '#toolbar',
        toolbarAlign: 'right',
        pagination: false,
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: false,
        searchAlign: 'right',
        showColumns: true,
        showRefresh: true,
        showToggle: true,
        showPaginationSwitch: false,
        showLoading: false,
        headerStyle: function () {
            return {
                css: {
                    background: '#3BB5A0',
                    color: '#ffffff',
                }
            }
        },
        columns: [
            {
                field: 'model',  //返回数据rows数组中的每个字典的键名与此处的field值要保持一致
                title: '模型',
            },
            {
                field: 'RMSE',
                title: '均方根误差(RMSE)',
            },
            {
                field: 'MAE',
                title: '平均值误差(MAE)',
            },
            {
                field: 'R2',
                title: '决定系数(R2)',
            },
            {
                field: 'ACC',
                title: '准确率(ACC)',
            },
        ],
    });
}

function drawPredTrueComp() {
    let myChart = echarts.init(document.getElementById('pred-true-comp'));
    myChart.hideLoading();
    let option;
    option = {
        color: ['#60c888', '#f1c40f', '#949494', '#2980b9', '#B37FEB'],
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ["FNN", "SVR", "XGBoost", "TRUE"],
            orient: 'horizontal',
            left: 'center',
        },
        grid: {
            left: '2%',
            right: '2%',
            bottom: '20%',
            top: '10%',
            containLabel: true
        },
        toolbox: {
            feature: {}
        },
        dataZoom: [
            {
                show: true,
                realtime: true,
                start: 0,
                end: 100
            },
            {
                type: 'inside',
                realtime: true,
                start: 0,
                end: 100
            },
        ],
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: all_data['true_data']['datetime'],
            name: '时间(h)',
            nameLocation: 'middle',
            nameGap: 20,
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            },
        },
        yAxis: {
            type: 'value',
            name: '负荷(MW)',
            nameTextStyle: {
                fontSize: 10,
            },
            axisLabel: {
                fontSize: 10,
            },
        },
        series: [
            {
                type: 'line',
                data: all_data['FNN']['pred'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: 'FNN',
                animation: false,
            },
            {
                type: 'line',
                data: all_data['SVR']['pred'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: 'SVR',
                animation: false,
            },
            {
                type: 'line',
                data: all_data['XGBoost']['pred'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: 'XGBoost',
                animation: false,
            },
            {
                type: 'line',
                data: all_data['true_data']['true'].map(value => value.toFixed(2)),
                // areaStyle: {},
                name: 'TRUE',
                animation: false,
            }
        ],
    };
    myChart.setOption(option, true);
    metric_data.sort((x, y) => x.RMSE - y.RMSE )
    // 提示信息
    let info = "<p>" + "观察四个模型预测值与真实值曲线<br/>"
        + "可以发现:<br/>"
        + metric_data[0].model + " 准确率最高<br/>"
        + metric_data[1].model + " 次之<br/>"
        + metric_data[2].model + " 再次之<br/>"    
        + "</p>";
    $('#info-pred-true-comp').attr('title', info).tooltip();
}

function drawDataTable() {
    let table = $('#table-data');
    let height = $('#pred-true-comp').height();
    table.bootstrapTable('hideLoading');
    table.bootstrapTable({
        data: [],
        height: height,
        striped: true,
        cache: false,
        toolbar: '#toolbar',
        toolbarAlign: 'right',
        pagination: true,
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: true,
        searchOnEnterKey: true,
        searchAlign: 'right',
        showColumns: true,
        showRefresh: true,
        showToggle: true,
        showPaginationSwitch: false,
        showLoading: false,
        showExport: true,                     //是否显示导出按钮
        exportTypes: ['csv', 'txt', 'sql', 'doc', 'excel', 'xlsx', 'pdf'],           //导出文件类型
        exportDataType: "all",             //basic当前页', 'all所有, 'selected'.
        exportOptions: {
            fileName: '负荷预测表',  //文件名称设置
            worksheetName: 'sheet1',  //表格工作区名称
            tableName: '负荷预测表',
            excelstyles: ['background-color', 'color', 'font-size', 'font-weight']
        },
        headerStyle: function () {
            return {
                css: {
                    background: '#3BB5A0',
                    color: '#ffffff',
                }
            }
        },
        columns: [
            {
                field: 'time',  //返回数据rows数组中的每个字典的键名与此处的field值要保持一致
                title: '时间',
            },
            {
                field: 'FNN',
                title: 'FNN预测值',
            },
            {
                field: 'SVR',
                title: 'SVR预测值',
            },
            {
                field: 'XGBoost',
                title: 'XGBoost预测值',
            },
            {
                field: 'TRUE',
                title: '真实值',
            },
        ],
    });
}

function loadMetricTable(data) {
    let table = $('#table-metric');
    table.bootstrapTable('hideLoading');
    table.bootstrapTable('load', data);
    data.sort((x, y) => x.RMSE - y.RMSE )
    // 提示信息
    let info = "<p>" + "分别使用了前馈神经网络(FNN)、支持向量回归(SVR)和XGBoost三种模型进行负荷预测。<br/>"
        + "下表是从均方根误差(RMSE)、平均值误差(MAE)、决定系数(R2)和准确率(ACC)四个方面衡量各模型表现。<br/>"
        + "各指标计算公式如下:<br/>"
        + "RMSE: " + "<img src='../static/img/RMSE.gif'><br/>"
        + "MAE: " + "<img src='../static/img/MAE.gif'><br/>"
        + "R2: " + "<img src='../static/img/R2.gif'><br/>"
        + "ACC: " + "<img src='../static/img/ACC.gif'><br/>"
        + "</p>";
    $('#info-table-metric').attr('title', info).tooltip();
}

function loadDataTable(data) {
    let table = $('#table-data');
    table.bootstrapTable('hideLoading');
    table.bootstrapTable('load', data);
}
