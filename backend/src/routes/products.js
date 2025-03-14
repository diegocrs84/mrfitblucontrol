const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const ExcelJS = require('exceljs');

// Rota para obter todos os produtos
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Rota para exportar produtos para Excel
router.get('/export/excel', auth, async (req, res) => {
  try {
    const products = await Product.find();
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Não há produtos cadastrados para exportar' });
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produtos');
    
    // Definir cabeçalhos
    worksheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Descrição', key: 'description', width: 50 },
      { header: 'Categoria', key: 'category', width: 15 },
      { header: 'Peso', key: 'weight', width: 10 },
      { header: 'Quantidade', key: 'quantity', width: 12 },
      { header: 'Preço de Custo', key: 'costPrice', width: 15 },
      { header: 'Preço de Venda', key: 'sellingPrice', width: 15 },
      { header: 'Preço iFood', key: 'ifoodPrice', width: 15 },
      { header: 'Margem (%)', key: 'marginPercentage', width: 15 },
      { header: 'Valor Margem', key: 'marginValue', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Data de Criação', key: 'createdAt', width: 20 }
    ];
    
    // Estilo para os cabeçalhos
    worksheet.getRow(1).font = { bold: true };
    
    // Adicionar dados
    products.forEach(product => {
      // Calcular margem de lucro
      const marginValue = product.sellingPrice - product.costPrice;
      const marginPercentage = product.costPrice > 0 
        ? ((product.sellingPrice - product.costPrice) / product.costPrice) * 100 
        : 0;
      
      worksheet.addRow({
        name: product.name,
        description: product.description,
        category: product.category,
        weight: product.weight,
        quantity: product.quantity,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        ifoodPrice: product.ifoodPrice,
        marginPercentage: marginPercentage,
        marginValue: marginValue,
        status: product.isActive ? 'Ativo' : 'Inativo',
        createdAt: new Date(product.createdAt).toLocaleDateString('pt-BR')
      });
    });
    
    // Formatar colunas de preço para exibir como moeda
    ['costPrice', 'sellingPrice', 'ifoodPrice', 'marginValue'].forEach(col => {
      worksheet.getColumn(col).numFmt = 'R$#,##0.00';
    });
    
    // Formatar coluna de percentual
    worksheet.getColumn('marginPercentage').numFmt = '0.00%';
    
    // Definir tipo de resposta e headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=produtos.xlsx');
    
    // Gerar e enviar o arquivo
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erro ao exportar produtos para Excel:', error);
    res.status(500).json({ error: 'Erro ao exportar produtos para Excel' });
  }
});

// Rota para obter um produto específico
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Rota para criar um novo produto
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, category, costPrice, sellingPrice, ifoodPrice, quantity, weight } = req.body;

    const newProduct = new Product({
      name,
      description,
      category,
      costPrice,
      sellingPrice,
      ifoodPrice,
      quantity,
      weight
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(400).json({ error: 'Erro ao criar produto' });
  }
});

// Rota para atualizar um produto
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, category, costPrice, sellingPrice, ifoodPrice, quantity, weight } = req.body;
    
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        category,
        costPrice,
        sellingPrice,
        ifoodPrice,
        quantity,
        weight,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(400).json({ error: 'Erro ao atualizar produto' });
  }
});

// Rota para alternar o status de um produto
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    product.isActive = !product.isActive;
    product.updatedAt = Date.now();
    
    await product.save();
    
    res.json(product);
  } catch (error) {
    console.error('Erro ao alternar status do produto:', error);
    res.status(500).json({ error: 'Erro ao alternar status do produto' });
  }
});

// Rota para deletar um produto
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

module.exports = router; 