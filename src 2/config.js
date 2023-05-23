//画布的大小
var canvasSize = {"maxX": 1024, "maxY": 768};

//数组中每个元素表示一个点的坐标[x,y,z]，这里一共有9个点
var vertex_pos = [
    [0, 0, 0],
    [700, 0, 0],
    [1000, 0, 0],
    [100, 400, 0],
    [600, 450, 0],
    [1000, 400, 0],
    [50, 650, 0],
    [700, 700, 0],
    [1000, 700, 0],
];

//顶点颜色数组，保存了上面顶点数组中每个顶点颜色信息[r,g,b]
var vertex_color = [
    [0, 0, 255],
    [0, 255, 0],
    [0, 255, 255],
    [255, 255, 0],
    [0, 255, 255],
    [0, 255, 0],
    [0, 255, 0],
    [0, 200, 100],
    [255, 255, 0]
];

//四边形数组，数组中每个元素表示一个四边形，其中的四个数字是四边形四个顶点的index，例如vertex[polygon[2][1]]表示第三个多边形的第2个顶点的坐标
var polygon = [
    [0, 1,4,3],
    [1, 2, 5, 4],
    [3, 4, 7, 6],
    [4, 5, 8, 7]
];
var quene =[];
function square(x)
{
    return x*x;
}
function chooseDragPoint(mouseX,mouseY)//根据鼠标位置选择拖动的点
{
    let distance=-1;
    let chosen = -1;
    for(let i = 0;i<vertex_pos.length;i++)
    {
        dist =square(vertex_pos[i][0]-mouseX)+square(vertex_pos[i][1]-mouseY);
        if(distance<0|| distance>dist)
        {
            distance = dist;
            chosen = i;
        }
    }
    if(distance>=5000)//如果距离所有点都很远，那么拖动失败
        chosen=-1;
    //更改多边形的绘制优先级
    let new_arr=[];
    let old_arr =[];
    quene.forEach((item)=>{
        if(polygon[item].indexOf(chosen)>=0)
        {
            new_arr.push(item);
        }else
        {
            old_arr.push(item);
        }
    })
    quene = old_arr.concat(new_arr);
    //加上偏移量，防止被选中的点闪现。
    return [chosen,vertex_pos[chosen][0]-mouseX,vertex_pos[chosen][1]-mouseY];
    
}
//更新选中的点的位置。
function updateVertexPos(order,x,y)
{
    if(order[0]>=0)
    {
        //加上边界值，防止点被拖动到画布之外。
        vertex_pos[order[0]] = [ Math.min( Math.max(0, x+order[1]),canvasSize['maxX']),
        Math.min(canvasSize.maxY, Math.max(y+order[2],0)),0];
        return vertex_pos[order[0]];
    }
    return 0;   
}
//该函数在一个canvas上绘制一个点
//其中cxt是从canvas中获得的一个2d上下文context
//    x,y分别是该点的横纵坐标
//    color是表示颜色的整形数组，形如[r,g,b]
//    color在这里会本转化为表示颜色的字符串，其内容也可以是：
//        直接用颜色名称:   "red" "green" "blue"
//        十六进制颜色值:   "#EEEEFF"
//        rgb分量表示形式:  "rgb(0-255,0-255,0-255)"
//        rgba分量表示形式:  "rgba(0-255,1-255,1-255,透明度)"
//由于canvas本身没有绘制单个point的接口，所以我们通过绘制一条短路径替代
function drawPoint(cxt,x,y, color)
{
    //建立一条新的路径
    cxt.beginPath();
    //设置画笔的颜色
    cxt.strokeStyle ="rgb("+color[0] + "," +
                            +color[1] + "," +
                            +color[2] + ")" ;
    //设置路径起始位置
    cxt.moveTo(x,y);
    //在路径中添加一个节点
    cxt.lineTo(x+1,y+1);
    //用画笔颜色绘制路径
    cxt.stroke();
}

//绘制线段的函数绘制一条从(x1,y1)到(x2,y2)的线段，cxt和color两个参数意义与绘制点的函数相同，
function drawLine(cxt,x1,y1,x2,y2,color){
    
    cxt.beginPath();
    cxt.strokeStyle ="rgba("+color[0] + "," +
                            +color[1] + "," +
                            +color[2] + "," +
                            +255 + ")" ;
    //这里线宽取1会有色差，但是类似半透明的效果有利于debug，取2效果较好
    cxt.lineWidth =1;
    cxt.moveTo(x1, y1);
    cxt.lineTo(x2, y2);
    cxt.stroke();
}
function compare(a,b)//a>b
{
    return a.x-b.x;
}
//采用活化边表法，为此构建一个类。
class AET
{
    //构造函数，参数为画布和多边形颜色
    constructor(cxt,color)
    {
        this.edges=[];
        this.aet=[];
        this.ymin = 0;
        this.ymax = 0;
        this.cxt = cxt;
        this.color = color;
    }
    //加入多边形所有的变，并更新多边形的ymin和ymax
    insert(alpha,beta)
    {
        let x1 = alpha[0],y1 = alpha[1],x2 = beta[0],y2=beta[1];

        let a = Object();
        if(y1<y2)
        {
            a.x1 = x1;
            a.ymin = y1;
            a.x2 = x2;
            a.ymax = y2;
        }else
        {
            a.x1 = x2;
            a.ymin = y2;
            a.x2 = x1;
            a.ymax = y1;
        }
        this.ymin = Math.min(this.ymin,a.ymin);
        this.ymax = Math.max(this.ymax,a.ymax);
        this.edges.push(a);
    }
    //绘制多边形
    paint()
    {
        for(let i = this.ymin; i < this.ymax;i++)
        {
            
            const that = this;
            this.now = i;
            //将ymin与扫描线相同的边加入活化边表
            this.edges= this.edges.filter((x)=>
            {
                if(x.ymin==that.now)
                {
                    let temp = Object();
                    temp.ymax = x.ymax;
                    temp.x = x.x1;
                    temp.m = 0;
                    
                    if(x.x1!=x.x2)
                    {
                        temp.m = (x.x1-x.x2)/(x.ymin-x.ymax);
                    }
                    that.aet.push(temp);
                }
                return x.ymin!=that.now;
            });
            //将ymax与扫描线相同的边移除活化边表
            this.aet = this.aet.filter((x)=>
            {
                return x.ymax!=that.now;
            });
            //对活化边表重新排序
            this.aet.sort(compare);
            //两两一组绘制
            for(let j = 0; j < this.aet.length&j+1<this.aet.length;j=j+2)
            {
                drawLine(this.cxt,Math.floor(this.aet[j].x),i,Math.ceil(this.aet[j+1].x),i,this.color);
                this.aet[j].x = this.aet[j].x+this.aet[j].m;
                this.aet[j+1].x = this.aet[j+1].x+this.aet[j+1].m;
            }
        }
    }
};
function test()
{
    vertex_pos=[];
    let cnt = 0;
    let pos = [];

    for(let i =0; i<canvasSize['maxX'];i+=100)
    {
        let temp = [];
        for(let j = 0; j <canvasSize['maxY'];j+=100)
        {
            vertex_pos.push([i,j,0]);
            temp.push(cnt);
            cnt++;
            if(vertex_color.length<cnt)
            {
                vertex_color.push(vertex_color[Math.ceil( Math.random()*cnt )%vertex_color.length]);
            }
        }
        pos.push(temp);
        
    }
    console.log(pos);
    polygon = [];
    console.log(vertex_pos.length);
    for(let i=0;i<7;i++)
    {
        for(let j = 0; j<10;j++)
        {
            polygon.push(
                [8*j+i,8*j+1+i,8*j+8+i+1,8*j+8+i]);
        }

    }
}