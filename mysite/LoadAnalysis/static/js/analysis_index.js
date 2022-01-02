// 表格以及相关参数
// to be changed: 1. 获取数据的url
$('#mytab').bootstrapTable({
    //需要根据当前地址改变
    url: "/indexgetdata",                     //从后台获取数据时，可以是json数组，也可以是json对象
    dataType: "json",
    method: 'get',                      //请求方式（*）
    toolbar: '#toolbar',                //工具按钮用哪个容器
    striped: true,                      //是否显示行间隔色
    cache: false,                       //是否使用缓存，默认为true，所以一般情况下需要设置一下这个属性（*）
    pagination: true,                   //是否显示分页（*）
    sortable: true,                     //是否启用排序
    sortOrder: "asc",                   //排序方式
    sidePagination: "client",           //分页方式：client客户端分页，server服务端分页（*）,数据为json数组时写client，json对象时（有total和rows时）这里要为server方式，写client列表无数据
    pageNumber: 1,                       //初始化加载第一页，默认第一页
    pageSize: 10,                       //每页的记录行数（*）
    pageList: [10, 25, 50, 100],        //可供选择的每页的行数（*）
    search: false,                       //是否显示表格搜索，此搜索是客户端搜索，不会进服务端，所以，个人感觉意义不大
    strictSearch: true,
    showColumns: false,                  //是否显示所有的列
    showRefresh: true,                  //是否显示刷新按钮
    minimumCountColumns: 2,             //最少允许的列数
    clickToSelect: true,                //是否启用点击选中行
    uniqueId: "id",                     //每一行的唯一标识，一般为主键列
    showToggle: true,                    //是否显示详细视图和列表视图的切换按钮
    cardView: false,                    //是否显示详细视图
    detailView: false,                   //是否显示父子表
    singleSelect: true,                  //是否单选

    //得到查询的参数
    queryParams: {
        search_kw: 'load_',
    },


    columns: [
        {
            field: 'district_id',  //返回数据rows数组中的每个字典的键名与此处的field值要保持一致
            title: '电网ID'
        },
        {
            field: 'district_name',
            title: '电网名称'
        },
    ],
});

// 搜索查询按钮触发事件
$(function () {
    $("#search-button").click(function () {
        $('#mytab').bootstrapTable(('refresh')); // 很重要的一步，刷新url！
        $('#search-keyword').val()
    })
});
//图标设置
$(function () {
    $(".glyphicon.glyphicon-refresh.icon-refresh").attr("class", "icon ion-refresh");
    $(".glyphicon.glyphicon-th.icon-th").attr("class", "icon ion-grid")
})
//点击分析按钮
$(function () {
    $('#analysis-button').click(function () {
        var selection = $('#mytab').bootstrapTable('getSelections');
        if (selection.length === 0) {
            alert("请选中一行")
        } else {
            var district_id = selection[0].district_id;
            //需要根据当前地址改变
            var url = window.location.href + district_id
            window.open(url)
        }
    })
})
